/**
 * ShinobiDroid 忍ドロイド — Dynamic Analyzer Module (Frida + ADB)
 *
 * Pipeline:
 *   1. Check for connected emulator (auto-launch if missing)
 *   2. Install APK on emulator
 *   3. Extract package name
 *   4. Ensure Frida server is running
 *   5. Run Frida scripts (SSL bypass, root bypass, combined)
 *   6. Parse output into structured findings array
 *   7. Save frida-results.json
 *   8. Cleanup (uninstall APK)
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Frida scripts directory
const SCRIPTS_DIR = join(__dirname, "scripts");

// How long to let each Frida script run before collecting output (ms)
const FRIDA_SCRIPT_TIMEOUT = parseInt(process.env.FRIDA_TIMEOUT_MS || "45000");

// Path to setup-emulator.ps1 (auto-launches emulator + Frida server)
const SETUP_EMULATOR_SCRIPT = join(__dirname, "setup-emulator.ps1");

// ADB command
const ADB = "adb";

// ── Logging ─────────────────────────────────────────────────────────────────

function log(level, msg) {
    const ts = new Date().toISOString();
    const prefix = { info: "ℹ️", ok: "✅", warn: "⚠️", error: "❌" }[level] || "•";
    console.log(`[${ts}] [DYNAMIC] ${prefix} ${msg}`);
}

// ── ADB Helpers ─────────────────────────────────────────────────────────────

/**
 * Check if an emulator/device is connected via ADB.
 */
export async function checkEmulator() {
    try {
        const { stdout } = await execFileAsync(ADB, ["devices"], { timeout: 10_000 });
        const lines = stdout.trim().split("\n").slice(1);
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2 && parts[1] === "device") {
                return { connected: true, device: parts[0] };
            }
        }
        return { connected: false, device: null };
    } catch {
        return { connected: false, device: null };
    }
}

/**
 * Try to auto-launch the emulator by running setup-emulator.ps1.
 * Waits up to 120 seconds for an ADB device to appear.
 */
async function launchEmulator(onProgress) {
    const notify = onProgress || (() => { });
    notify("🚀 Auto-launching emulator via setup-emulator.ps1...");
    log("info", "Attempting to auto-launch emulator...");

    try {
        await access(SETUP_EMULATOR_SCRIPT);
    } catch {
        log("warn", "setup-emulator.ps1 not found — cannot auto-launch emulator");
        return false;
    }

    // Fire and forget — launch the setup script in background
    const proc = spawn("powershell.exe", [
        "-ExecutionPolicy", "Bypass",
        "-File", SETUP_EMULATOR_SCRIPT,
    ], {
        detached: true,
        stdio: "ignore",
    });
    proc.unref();

    // Wait for emulator to come online (check every 5s, up to 2 minutes)
    log("info", "Waiting for emulator to appear in adb devices (up to 2 minutes)...");
    for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const emu = await checkEmulator();
        if (emu.connected) {
            log("ok", `Emulator connected after ${(attempt + 1) * 5}s: ${emu.device}`);
            // Give it a few more seconds to fully boot
            await new Promise(r => setTimeout(r, 5000));
            return true;
        }
        log("info", `Waiting for emulator... (${(attempt + 1) * 5}s)`);
    }

    log("error", "Emulator did not come online within 2 minutes");
    return false;
}

/**
 * Install an APK on the connected emulator.
 */
async function installApk(apkPath) {
    try {
        const { stdout, stderr } = await execFileAsync(ADB, ["install", "-r", "-t", apkPath], {
            timeout: 120_000,
        });
        if (stdout.includes("Success") || stdout.includes("success")) {
            return { success: true };
        }
        return { success: false, error: (stderr || stdout).slice(0, 300) };
    } catch (err) {
        return { success: false, error: err.message.slice(0, 300) };
    }
}

/**
 * Uninstall a package from the emulator.
 */
async function uninstallApk(packageName) {
    try {
        await execFileAsync(ADB, ["uninstall", packageName], { timeout: 30_000 });
    } catch {
        // Ignore — best effort cleanup
    }
}

/**
 * Extract package name from a MobSF report or by querying aapt.
 */
async function getPackageName(mobsfReport, apkPath) {
    if (mobsfReport?.package_name) return mobsfReport.package_name;

    for (const tool of ["aapt", "aapt2"]) {
        try {
            const { stdout } = await execFileAsync(tool, ["dump", "badging", apkPath], { timeout: 30_000 });
            const match = stdout.match(/package:\s+name='([^']+)'/);
            if (match) return match[1];
        } catch { /* tool not available */ }
    }

    return null;
}

// ── Frida Helpers ───────────────────────────────────────────────────────────

/**
 * Ensure a RESPONSIVE Frida server is running on the emulator.
 *
 * Always kills any existing server and starts fresh — a stale server that
 * passes `ps | grep` but can't enumerate processes will brick all scripts.
 * Verifies connectivity via `frida-ps -U` before returning true.
 */
async function ensureFridaServer() {
    // Attempt to restart adb as root (works on most AVDs where su does not)
    try { await execFileAsync(ADB, ["root"], { timeout: 10_000 }); } catch { /* ignore */ }

    // Kill any existing (possibly stale) frida-server
    try {
        await execFileAsync(ADB, [
            "shell", "pkill -f frida-server"
        ], { timeout: 5000 });
        await new Promise(r => setTimeout(r, 1000));
    } catch { /* nothing to kill — that's fine */ }

    // Start fresh frida-server as a daemon
    log("info", "Starting fresh Frida server on emulator...");
    try {
        await execFileAsync(ADB, [
            "shell", "nohup /data/local/tmp/frida-server -D > /dev/null 2>&1 &"
        ], { timeout: 10_000 });
    } catch (err) {
        log("error", "Failed to start Frida server: " + err.message);
        return false;
    }

    // Verify server is actually responsive (not just running)
    // frida-ps -U must be able to enumerate processes
    for (let attempt = 1; attempt <= 2; attempt++) {
        await new Promise(r => setTimeout(r, 2000 * attempt)); // 2s, then 4s
        try {
            const { stdout } = await execFileAsync("frida-ps", ["-U"], { timeout: 10_000 });
            const lines = stdout.split("\n").filter(l => l.trim() && !l.startsWith("PID") && !l.startsWith("---"));
            if (lines.length > 0) {
                log("ok", `Frida server responsive — ${lines.length} processes enumerated`);
                return true;
            }
        } catch (err) {
            log("warn", `Frida connectivity check attempt ${attempt}/2 failed: ${err.message}`);
        }
    }

    log("error", "Frida server started but frida-ps cannot enumerate processes");
    return false;
}

/**
 * Run a single Frida script against a package and capture output.
 *
 * Spawn mode: `frida -U -f pkg -l script` (spawns app paused, loads script,
 * then we write `%resume\n` to stdin after a short delay to unpause).
 *
 * If spawn fails (e.g. Frida can't resolve the package identifier, or
 * the CLI rejects a flag), falls back to attach mode:
 *   1. Launch app via `am start` or `monkey`
 *   2. Get PID via `pidof`
 *   3. Attach with `frida -U -p <PID> -l script`
 *
 * After hooks are installed, runs `adb shell monkey` to exercise the app
 * and trigger network calls, UI flows, storage access, etc.
 */
function runFridaScript(packageName, scriptPath, scriptName) {
    return new Promise(async (resolve) => {
        const output = [];
        let timedOut = false;

        log("info", `Running ${scriptName} against ${packageName}...`);

        // ── Verify package is installed ──────────────────────────────────
        try {
            const { stdout: pkgList } = await execFileAsync(ADB, [
                "shell", "pm", "list", "packages", packageName
            ], { timeout: 10_000 });
            if (!pkgList.includes(packageName)) {
                log("warn", `  Package ${packageName} not found on device`);
                resolve({
                    name: scriptName,
                    output: [`Package not installed: ${packageName}`],
                    success: false,
                    error: "Package not found on device",
                });
                return;
            }
        } catch (pmErr) {
            log("warn", `  Could not verify package: ${pmErr.message}`);
            // Continue anyway — pm might not be responsive but Frida might work
        }

        // Patterns that indicate Frida spawn/CLI failure (not script-level errors)
        const FAILURE_PATTERNS = [
            "unable to find application",
            "Failed to spawn",
            "unrecognized arguments",
            "unable to connect to remote frida-server",
            "unable to find process",
        ];

        function isFridaCLIFailure(line) {
            return FAILURE_PATTERNS.some(p => line.includes(p));
        }

        // ── Spawn mode ──────────────────────────────────────────────────
        // Uses -f to spawn the app in a paused state, -l loads the script,
        // then we write %resume to stdin to unpause and let the app run.
        const trySpawn = () => {
            return new Promise((resolveSpawn) => {
                let spawnFailed = false;

                const proc = spawn("frida", [
                    "-U",
                    "-f", packageName,
                    "-l", scriptPath,
                ], {
                    stdio: ["pipe", "pipe", "pipe"],
                    timeout: FRIDA_SCRIPT_TIMEOUT + 5000,
                });

                proc.stdout.on("data", (data) => {
                    const lines = data.toString().split("\n").filter(l => l.trim());
                    output.push(...lines);
                    for (const line of lines) {
                        if (isFridaCLIFailure(line)) spawnFailed = true;
                    }
                });

                proc.stderr.on("data", (data) => {
                    const lines = data.toString().split("\n").filter(l => l.trim());
                    output.push(...lines);
                    for (const line of lines) {
                        if (isFridaCLIFailure(line)) spawnFailed = true;
                    }
                });

                // After 1.5s (script loaded, hooks installed), resume the app
                // by writing %resume to Frida's REPL stdin
                const resumeDelay = setTimeout(() => {
                    if (!spawnFailed && proc.stdin?.writable) {
                        try {
                            proc.stdin.write("%resume\n");
                        } catch { /* ignore write errors on dead proc */ }
                    }
                }, 1500);

                // After 6s (app resumed + running), exercise with monkey
                const monkeyDelay = setTimeout(() => {
                    if (!spawnFailed) exerciseApp(packageName).catch(() => { });
                }, 6000);

                const timer = setTimeout(() => {
                    timedOut = true;
                    try { proc.kill("SIGTERM"); } catch { /* ignore */ }
                }, FRIDA_SCRIPT_TIMEOUT);

                proc.on("close", (code) => {
                    clearTimeout(timer);
                    clearTimeout(monkeyDelay);
                    clearTimeout(resumeDelay);
                    resolveSpawn({
                        success: !spawnFailed && (timedOut || code === 0),
                        spawnFailed,
                        code,
                    });
                });

                proc.on("error", (err) => {
                    clearTimeout(timer);
                    clearTimeout(monkeyDelay);
                    clearTimeout(resumeDelay);
                    resolveSpawn({ success: false, spawnFailed: true, error: err.message });
                });
            });
        };

        // ── Attach mode (fallback) ──────────────────────────────────────
        // Launches the app first, then attaches Frida to the running PID.
        const tryAttach = async () => {
            output.length = 0; // Clear spawn failure output
            log("info", `  Spawn failed — falling back to attach mode for ${scriptName}`);

            // Step 1: Launch the app
            try {
                await execFileAsync(ADB, [
                    "shell", "monkey",
                    "-p", packageName,
                    "-c", "android.intent.category.LAUNCHER",
                    "1"
                ], { timeout: 10_000 });
            } catch {
                // monkey failed — try am start with a common activity pattern
                try {
                    await execFileAsync(ADB, [
                        "shell", "am", "start",
                        "-n", `${packageName}/.MainActivity`,
                    ], { timeout: 10_000 });
                } catch (e) {
                    log("warn", `  Could not launch app: ${e.message}`);
                }
            }

            // Step 2: Wait for app to start, then get PID
            await new Promise(r => setTimeout(r, 3000));

            let fridaArgs;
            try {
                const { stdout: pidOut } = await execFileAsync(ADB, [
                    "shell", "pidof", packageName
                ], { timeout: 5000 });
                const pid = pidOut.trim().split(/\s+/)[0]; // Take first PID if multiple
                if (pid && /^\d+$/.test(pid)) {
                    fridaArgs = ["-U", "-p", pid, "-l", scriptPath];
                    log("info", `  Attaching to PID ${pid}`);
                } else {
                    log("warn", `  pidof returned invalid PID: "${pidOut.trim()}"`);
                    fridaArgs = ["-U", "-n", packageName, "-l", scriptPath];
                }
            } catch {
                log("warn", `  pidof failed — trying name-based attach`);
                fridaArgs = ["-U", "-n", packageName, "-l", scriptPath];
            }

            // Step 3: Attach Frida
            return new Promise((resolveAttach) => {
                timedOut = false;

                const proc = spawn("frida", fridaArgs, {
                    stdio: ["pipe", "pipe", "pipe"],
                    timeout: FRIDA_SCRIPT_TIMEOUT + 5000,
                });

                proc.stdout.on("data", (data) => {
                    output.push(...data.toString().split("\n").filter(l => l.trim()));
                });

                proc.stderr.on("data", (data) => {
                    output.push(...data.toString().split("\n").filter(l => l.trim()));
                });

                // Exercise app after 3s
                const monkeyDelay = setTimeout(() => {
                    exerciseApp(packageName).catch(() => { });
                }, 3000);

                const timer = setTimeout(() => {
                    timedOut = true;
                    try { proc.kill("SIGTERM"); } catch { /* ignore */ }
                }, FRIDA_SCRIPT_TIMEOUT);

                proc.on("close", (code) => {
                    clearTimeout(timer);
                    clearTimeout(monkeyDelay);
                    const success = timedOut || code === 0;
                    resolveAttach(success);
                });

                proc.on("error", (err) => {
                    clearTimeout(timer);
                    clearTimeout(monkeyDelay);
                    log("error", `  Attach error: ${err.message}`);
                    resolveAttach(false);
                });
            });
        };

        // ── Execute ─────────────────────────────────────────────────────
        const spawnResult = await trySpawn();

        if (spawnResult.spawnFailed) {
            const attachSuccess = await tryAttach();
            log(attachSuccess ? "ok" : "warn",
                `${scriptName}: ${output.length} lines (attach mode, ${attachSuccess ? "ok" : "failed"})`);
            resolve({
                name: scriptName,
                output,
                success: attachSuccess,
                ...((!attachSuccess) ? { error: "Spawn failed, attach " + (attachSuccess ? "ok" : "failed") } : {}),
            });
        } else {
            const success = spawnResult.success;
            log(success ? "ok" : "warn",
                `${scriptName}: ${output.length} lines (exit: ${timedOut ? "timeout" : spawnResult.code})`);
            resolve({
                name: scriptName,
                output,
                success,
                ...((!success && !timedOut) ? { error: `Exit code ${spawnResult.code}` } : {}),
            });
        }
    });
}

/**
 * Exercise the app using targeted `adb shell input` commands.
 *
 * We do NOT use `adb shell monkey` because monkey's touch events can land
 * on the notification bar / quick-settings panel, toggling WiFi, Bluetooth,
 * screen brightness, etc. — which breaks network-dependent Frida hooks
 * and produces false negatives.
 *
 * Instead, we send controlled tap and swipe events at coordinates strictly
 * within the app's content area (y: 200–1700), avoiding the status bar
 * (top ~100px) and navigation bar (bottom ~100px).
 */
async function exerciseApp(packageName) {
    try {
        log("info", `Exercising ${packageName} with safe targeted inputs...`);

        // Safe content area boundaries (works for 1080x1920 and 1080x2400)
        const minX = 50, maxX = 1030;
        const minY = 200, maxY = 1700; // well below status bar, above nav bar

        const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

        const actions = [];

        // Generate 30 taps at random safe positions
        for (let i = 0; i < 30; i++) {
            actions.push(`input tap ${randInt(minX, maxX)} ${randInt(minY, maxY)}`);
        }

        // Interleave 8 swipes (scroll up/down within app)
        for (let i = 0; i < 8; i++) {
            const x = randInt(200, 800);
            const y1 = randInt(400, 900);
            const y2 = randInt(1000, 1500);
            // Alternate scroll direction
            actions.push(i % 2 === 0
                ? `input swipe ${x} ${y1} ${x} ${y2} 300`   // scroll up
                : `input swipe ${x} ${y2} ${x} ${y1} 300`); // scroll down
        }

        // Add 4 Back presses to navigate between screens
        for (let i = 0; i < 4; i++) {
            actions.push("input keyevent KEYCODE_BACK");
        }

        // Shuffle actions for more natural interaction
        for (let i = actions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [actions[i], actions[j]] = [actions[j], actions[i]];
        }

        // Execute in batches (chain with && and sleep between batches)
        const batchSize = 6;
        for (let i = 0; i < actions.length; i += batchSize) {
            const batch = actions.slice(i, i + batchSize);
            const cmd = batch.join(" && sleep 0.15 && ");
            try {
                await execFileAsync(ADB, ["shell", cmd], {
                    timeout: 15_000,
                });
            } catch { /* individual batch failure is fine */ }
        }

        log("ok", `App exercised — ${actions.length} safe input events sent`);
    } catch (err) {
        log("info", `Exerciser finished (${err.message?.substring(0, 60) || "done"})`);
    }
}

// ── Output Parser ────────────────────────────────────────────────────────────

/**
 * Parse raw Frida output lines into structured findings for the database.
 * Maps common patterns to severity/category/description.
 */
function parseOutputToFindings(scriptResults, scanId) {
    const findings = [];
    const seenTitles = new Set();

    const PATTERNS = [
        // ── SSL/TLS (MASVS-NETWORK) ──────────────────────────────────────
        { re: /\[\+\].*Bypass.*ssl|\[\+\].*ssl.*bypass|\[\+\].*certificate.*pinn|\[\+\].*pinn.*bypass/i, sev: "high", cat: "SSL Pinning", title: "SSL Certificate Pinning Bypassed", rec: "Implement multi-layer certificate pinning using network security config and Conscrypt. Verify pin hashes at runtime.", owasp: "M3: Insecure Communication" },
        { re: /\[\+\].*TrustManager|\[\+\].*checkServerTrusted|\[\+\].*SSLContext\.init/i, sev: "high", cat: "SSL Pinning", title: "Custom TrustManager Hooked", rec: "Avoid custom TrustManager implementations. Use standard SSL validation.", owasp: "M3: Insecure Communication" },
        { re: /\[\+\].*OkHttp.*bypass|\[\+\].*okhttp.*pin/i, sev: "high", cat: "SSL Pinning", title: "OkHttp Certificate Pinning Bypassed", rec: "Upgrade OkHttp and use CertificatePinner with backup pins.", owasp: "M3: Insecure Communication" },

        // ── Root Detection (MASVS-RESILIENCE) ────────────────────────────
        { re: /Bypass root check|Bypass return value for binary|Bypass.*su.*command|Bypass native fopen/i, sev: "medium", cat: "Root Detection", title: "Root Detection Bypassed", rec: "Implement multi-layer root detection including native checks, file system audits, and SafetyNet.", owasp: "M8: Code Tampering" },

        // ── Cryptography (MASVS-CRYPTO) ──────────────────────────────────
        { re: /\[CRYPTO\].*WEAK ALGORITHM/i, sev: "high", cat: "Weak Cryptography", title: "Weak Cryptographic Algorithm Detected", rec: "Replace DES/RC4/ECB with AES-256-GCM. Avoid ECB mode entirely.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*WEAK HASH/i, sev: "high", cat: "Weak Cryptography", title: "Weak Hash Function Used (MD5/SHA-1)", rec: "Replace MD5/SHA-1 with SHA-256 or SHA-3 for cryptographic hashing.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*WEAK KEY/i, sev: "high", cat: "Weak Cryptography", title: "Weak or Short Cryptographic Key", rec: "Use AES-256 (32-byte keys minimum). Store keys in Android Keystore.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*STATIC SEED/i, sev: "medium", cat: "Weak Cryptography", title: "Static Seed for SecureRandom", rec: "Never seed SecureRandom with a static value. Use the default system entropy.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*STATIC\/ZERO IV/i, sev: "high", cat: "Weak Cryptography", title: "Static or Zero IV Detected", rec: "Generate a fresh random IV for every encryption operation. Never reuse IVs.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*Cipher\.getInstance/i, sev: "info", cat: "Cryptography", title: "Cryptographic Cipher Operation", rec: "Ensure AES-256-GCM or ChaCha20-Poly1305 is used. Avoid CBC without HMAC.", owasp: "M5: Insufficient Cryptography" },
        { re: /\[CRYPTO\].*SecretKeySpec|\[CRYPTO\].*KeyGenerator/i, sev: "info", cat: "Key Management", title: "Key Generation/Creation Observed", rec: "Store keys in Android Keystore System, not in app memory or SharedPreferences.", owasp: "M5: Insufficient Cryptography" },

        // ── Network Traffic (MASVS-NETWORK) ──────────────────────────────
        { re: /\[NET\].*CLEARTEXT HTTP/i, sev: "high", cat: "Cleartext Traffic", title: "Cleartext HTTP Connection Detected", rec: "Use HTTPS for all connections. Set android:usesCleartextTraffic=false in manifest.", owasp: "M3: Insecure Communication" },
        { re: /\[NET\].*CUSTOM VERIFIER/i, sev: "high", cat: "Network Security", title: "Custom HostnameVerifier Set", rec: "Avoid custom HostnameVerifier. Use default strict verification.", owasp: "M3: Insecure Communication" },
        { re: /\[NET\].*JS INJECTION/i, sev: "high", cat: "Network Security", title: "JavaScript Injection via WebView", rec: "Validate and sanitize all URLs loaded in WebViews. Avoid javascript: protocol.", owasp: "M3: Insecure Communication" },
        { re: /\[\+\] \[NET\].*URL\.openConnection|\[\+\] \[NET\].*OkHttp3|\[\+\] \[NET\].*WebView|\[\+\] \[NET\].*DNS|\[\+\] \[NET\].*Socket/i, sev: "info", cat: "Network Traffic", title: "HTTP Network Call Observed", rec: "Verify all connections use HTTPS with strict hostname verification.", owasp: "M3: Insecure Communication" },

        // ── Data Storage (MASVS-STORAGE) ─────────────────────────────────
        { re: /\[STORAGE\].*SENSITIVE KEY|\[STORAGE\].*SENSITIVE DATA STORED/i, sev: "high", cat: "Insecure Storage", title: "Sensitive Data in SharedPreferences", rec: "Use EncryptedSharedPreferences from AndroidX Security for sensitive data. Never store passwords or tokens in plaintext.", owasp: "M2: Insecure Data Storage" },
        { re: /\[STORAGE\].*EXTERNAL STORAGE/i, sev: "high", cat: "Insecure Storage", title: "Data Written to External Storage", rec: "Avoid external storage for sensitive data. Use internal storage with file-based encryption.", owasp: "M2: Insecure Data Storage" },
        { re: /\[STORAGE\].*SENSITIVE QUERY/i, sev: "medium", cat: "Insecure Storage", title: "Sensitive Data in SQLite Query", rec: "Encrypt local databases using SQLCipher. Parameterize all queries.", owasp: "M2: Insecure Data Storage" },
        { re: /\[STORAGE\].*CLIPBOARD/i, sev: "medium", cat: "Insecure Storage", title: "Clipboard Data Access", rec: "Avoid copying sensitive data to clipboard. Clear clipboard after use.", owasp: "M2: Insecure Data Storage" },
        { re: /\[STORAGE\].*LOGCAT/i, sev: "medium", cat: "Insecure Storage", title: "Sensitive Data Leaked to Logcat", rec: "Remove all sensitive logging in production builds. Use ProGuard/R8 to strip Log calls.", owasp: "M2: Insecure Data Storage" },
        { re: /\[STORAGE\].*SharedPrefs\.|\[STORAGE\].*SQLiteDatabase/i, sev: "info", cat: "Data Storage", title: "Data Storage Operation Observed", rec: "Encrypt sensitive stored data. Use Android Keystore for key management.", owasp: "M2: Insecure Data Storage" },

        // ── Authentication (MASVS-AUTH) ──────────────────────────────────
        { re: /\[AUTH\].*WEAK BIOMETRIC|\[AUTH\].*NO CRYPTO/i, sev: "high", cat: "Authentication", title: "Weak Biometric Authentication (No CryptoObject)", rec: "Always use CryptoObject with BiometricPrompt. This binds authentication to a cryptographic operation and prevents event-only bypass.", owasp: "M6: Insecure Authorization" },
        { re: /\[AUTH\].*JS BRIDGE EXPOSED/i, sev: "high", cat: "Authentication", title: "JavaScript Bridge Exposed in WebView", rec: "Restrict JS interfaces with @JavascriptInterface annotation. Validate all input from JS bridges.", owasp: "M6: Insecure Authorization" },
        { re: /\[AUTH\].*UNIVERSAL ACCESS/i, sev: "high", cat: "Authentication", title: "WebView Universal File Access Enabled", rec: "Disable setAllowUniversalAccessFromFileURLs. This allows any file URL to access other origins.", owasp: "M6: Insecure Authorization" },
        { re: /\[AUTH\].*SESSION COOKIE/i, sev: "medium", cat: "Authentication", title: "Session Cookie Set in WebView", rec: "Set Secure and HttpOnly flags on cookies. Use SameSite attribute.", owasp: "M6: Insecure Authorization" },
        { re: /\[AUTH\].*DEVICE ACCOUNTS/i, sev: "medium", cat: "Authentication", title: "Device Accounts Accessed", rec: "Request only the minimum account permissions needed. Avoid accessing all device accounts.", owasp: "M6: Insecure Authorization" },

        // ── Platform (MASVS-PLATFORM) ────────────────────────────────────
        { re: /\[PLATFORM\].*SENSITIVE DATA IN INTENT/i, sev: "high", cat: "Platform Security", title: "Sensitive Data Leaked via Intent Extras", rec: "Never put passwords/tokens in Intent extras. Use encrypted storage or bound services for IPC.", owasp: "M1: Improper Platform Usage" },
        { re: /\[PLATFORM\].*IMPLICIT BROADCAST/i, sev: "medium", cat: "Platform Security", title: "Implicit Broadcast Sent", rec: "Use LocalBroadcastManager or explicit broadcasts with permissions. Implicit broadcasts can be intercepted.", owasp: "M1: Improper Platform Usage" },
        { re: /\[PLATFORM\].*MUTABLE PENDING INTENT/i, sev: "high", cat: "Platform Security", title: "Mutable PendingIntent Created", rec: "Use FLAG_IMMUTABLE for PendingIntents (Android 12+ requirement). Mutable PendingIntents can be hijacked.", owasp: "M1: Improper Platform Usage" },
        { re: /\[PLATFORM\].*COMMAND EXECUTION/i, sev: "high", cat: "Platform Security", title: "Runtime Command Execution Detected", rec: "Avoid Runtime.exec(). If necessary, never pass user input to shell commands.", owasp: "M1: Improper Platform Usage" },

        // ── Resilience (MASVS-RESILIENCE) ────────────────────────────────
        { re: /\[RESILIENCE\].*isDebuggerConnected.*bypassed/i, sev: "medium", cat: "Anti-Debug", title: "Debugger Detection Bypassed", rec: "Implement multi-layer debug detection: TracerPid, timing checks, and native ptrace.", owasp: "M9: Reverse Engineering" },
        { re: /\[RESILIENCE\].*Frida detection.*bypassed/i, sev: "medium", cat: "Anti-Tamper", title: "Frida Detection Bypassed", rec: "Implement multiple Frida detection methods: port scanning, /proc/maps, named pipes, and code integrity.", owasp: "M9: Reverse Engineering" },
        { re: /\[RESILIENCE\].*EMULATOR FINGERPRINT/i, sev: "low", cat: "Emulator Detection", title: "Emulator Fingerprint Detected", rec: "Implement emulator detection with multiple Build field checks, sensor validation, and telephony checks.", owasp: "M9: Reverse Engineering" },
        { re: /\[RESILIENCE\].*System\.exit.*PREVENTED/i, sev: "medium", cat: "Anti-Tamper", title: "Anti-Tamper Kill Blocked", rec: "Implement integrity checks that are harder to bypass than System.exit(). Use native code for critical checks.", owasp: "M9: Reverse Engineering" },
        { re: /\[RESILIENCE\].*TracerPid.*bypassed/i, sev: "medium", cat: "Anti-Debug", title: "TracerPid Debug Check Bypassed", rec: "Combine TracerPid with ptrace self-attachment and timing-based detection.", owasp: "M9: Reverse Engineering" },
    ];

    for (const scriptResult of scriptResults) {
        for (const line of scriptResult.output) {
            for (const { re, sev, cat, title, rec, owasp } of PATTERNS) {
                if (re.test(line)) {
                    const key = `${scriptResult.name}:${title}`;
                    if (!seenTitles.has(key)) {
                        seenTitles.add(key);
                        findings.push({
                            scan_id: scanId,
                            title: title,
                            severity: sev,
                            severity_order: { critical: 1, high: 2, medium: 3, low: 4, info: 5 }[sev] || 5,
                            category: `Dynamic — ${cat}`,
                            description: `Frida Script: ${scriptResult.name}\nObserved: ${line.trim().substring(0, 300)}`,
                            recommendation: rec,
                            cvss_score: null,
                            owasp_category: owasp || null,
                        });
                    }
                    break;
                }
            }
        }
    }

    return findings;
}

/**
 * Detect successful hook installations as additional findings.
 * If a bypass hook was installed (no [-] error message), that PROVES
 * the protection CAN be bypassed — even if it didn't fire during
 * the monitoring window.
 */
function detectHookInstallations(scriptResults, scanId) {
    const findings = [];

    // SSL-BYE.js: Check if TrustManager/SSLContext hooks installed (no [-] error)
    for (const r of scriptResults) {
        if (r.name !== "SSL Pinning Bypass" || !r.success) continue;
        const outputText = r.output.join("\n");

        // If the script ran but the TrustManager [-] message is absent, the hook installed
        if (!outputText.includes("[-] TrustManager (Android < 7) pinner not found")) {
            findings.push({
                scan_id: scanId,
                title: "SSL TrustManager Bypass Hook Installed",
                severity: "high",
                severity_order: 2,
                category: "Dynamic — SSL Pinning",
                description: "Frida Script: SSL Pinning Bypass\nThe custom TrustManager and SSLContext.init() hooks installed successfully. This means SSL certificate validation can be completely bypassed at runtime.",
                recommendation: "Implement additional certificate pinning beyond TrustManager: use OkHttp CertificatePinner, network security config with backup pins, and runtime integrity checks to detect hooking frameworks.",
                cvss_score: null,
                owasp_category: "M3: Insecure Communication",
            });
        }

        // Check Conscrypt/TrustManagerImpl hooks
        if (!outputText.includes("[-] Conscrypt CertPinManager pinner not found")) {
            findings.push({
                scan_id: scanId,
                title: "Conscrypt CertPinManager Bypass Hook Installed",
                severity: "high",
                severity_order: 2,
                category: "Dynamic — SSL Pinning",
                description: "Frida Script: SSL Pinning Bypass\nConscrypt CertPinManager hook installed. Android system-level certificate pinning can be bypassed.",
                recommendation: "Implement application-level pinning on top of system-level Conscrypt checks.",
                cvss_score: null,
                owasp_category: "M3: Insecure Communication",
            });
        }
    }

    // ROOTER.js / PintooR.js: successful root detection bypass
    for (const r of scriptResults) {
        if (!r.name.includes("Root") && !r.name.includes("PintooR")) continue;
        if (!r.success) continue;
        const outputText = r.output.join("\n");

        // If PackageManager hook installed and classes were enumerated successfully
        if (outputText.includes("Loaded") && outputText.includes("classes")) {
            findings.push({
                scan_id: scanId,
                title: "Root Detection Bypass Hooks Installed",
                severity: "medium",
                severity_order: 3,
                category: "Dynamic — Root Detection",
                description: `Frida Script: ${r.name}\nRoot detection bypass hooks installed successfully — PackageManager, File.exists, Runtime.exec, and native interceptors are all active.`,
                recommendation: "Implement server-side root detection validation. Don't rely solely on client-side checks. Use SafetyNet/Play Integrity API.",
                cvss_score: null,
                owasp_category: "M8: Code Tampering",
            });
            break; // Only one finding for root bypass
        }
    }

    // SHINOBI-RESILIENCE.js: Emulator detection findings
    for (const r of scriptResults) {
        if (r.name !== "Resilience Bypass" || !r.success) continue;
        const outputText = r.output.join("\n");

        if (outputText.includes("Debug.isDebuggerConnected") && outputText.includes("bypassed")) {
            // Already captured by parseOutputToFindings — skip
        }
    }

    return findings;
}

// ── Count helpers ────────────────────────────────────────────────────────────

function countFridaMatches(scriptResults, pattern) {
    let count = 0;
    for (const r of scriptResults) {
        for (const line of r.output) {
            if (pattern.test(line)) count++;
        }
    }
    return count;
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run dynamic analysis on an APK file.
 *
 * @param {string} apkPath - Absolute path to APK on disk
 * @param {string} outDir - Directory to save results
 * @param {object|null} mobsfReport - MobSF JSON report (for package name)
 * @param {function|null} onProgress - Progress callback (string => void)
 * @param {string|null} scanId - Supabase scan ID (for findings linking)
 * @returns {Promise<{success, results?, findings?, error?, skipped?}>}
 */
export async function runDynamicAnalysis(apkPath, outDir, mobsfReport = null, onProgress = null, scanId = null) {
    const notify = onProgress || (() => { });

    // 1. Check emulator — attempt auto-launch if not found
    notify("🔌 Checking emulator connection...");
    let emu = await checkEmulator();

    if (!emu.connected) {
        notify("⚙️ No emulator found. Attempting auto-launch via setup-emulator.ps1...");
        const launched = await launchEmulator(notify);
        if (launched) {
            emu = await checkEmulator();
        }
    }

    if (!emu.connected) {
        log("warn", "No emulator connected — skipping dynamic analysis");
        return {
            success: false,
            error: "No emulator connected. Start an Android emulator or run setup-emulator.ps1.",
            skipped: true,
        };
    }
    log("ok", `Emulator connected: ${emu.device}`);

    // 2. Get package name
    const packageName = await getPackageName(mobsfReport, apkPath);
    if (!packageName) {
        return {
            success: false,
            error: "Could not determine package name. Ensure aapt is in PATH or MobSF report has package_name.",
        };
    }
    log("info", `Package: ${packageName}`);

    // 3. Install APK
    notify("📲 Installing APK on emulator...");
    const installResult = await installApk(apkPath);
    if (!installResult.success) {
        log("error", `APK install failed: ${installResult.error}`);
        return { success: false, error: `APK install failed: ${installResult.error}` };
    }
    log("ok", "APK installed on emulator");

    // 4. Ensure Frida server is running
    notify("🔧 Starting Frida server...");
    const fridaReady = await ensureFridaServer();
    if (!fridaReady) {
        await uninstallApk(packageName);
        return {
            success: false,
            error: "Could not start Frida server. Ensure it is installed on the emulator (run setup-emulator.ps1 once to configure).",
        };
    }

    // 5. Run Frida scripts
    const scripts = [
        // MASVS-NETWORK — SSL/TLS bypass
        { name: "SSL Pinning Bypass", file: join(SCRIPTS_DIR, "SSL-BYE.js") },
        // MASVS-RESILIENCE — Root detection
        { name: "Root Detection Bypass", file: join(SCRIPTS_DIR, "ROOTER.js") },
        // MASVS-RESILIENCE + NETWORK — Combined
        { name: "Combined Bypass (PintooR)", file: join(SCRIPTS_DIR, "PintooR.js") },
        // MASVS-CRYPTO — Cryptographic monitoring
        { name: "Crypto Monitor", file: join(SCRIPTS_DIR, "SHINOBI-CRYPTO.js") },
        // MASVS-NETWORK — Network traffic analysis
        { name: "Network Monitor", file: join(SCRIPTS_DIR, "SHINOBI-NETWORK.js") },
        // MASVS-STORAGE — Data storage monitoring
        { name: "Storage Monitor", file: join(SCRIPTS_DIR, "SHINOBI-STORAGE.js") },
        // MASVS-AUTH — Authentication monitoring
        { name: "Auth Monitor", file: join(SCRIPTS_DIR, "SHINOBI-AUTH.js") },
        // MASVS-PLATFORM — Platform interaction
        { name: "Platform Monitor", file: join(SCRIPTS_DIR, "SHINOBI-PLATFORM.js") },
        // MASVS-RESILIENCE — Anti-tamper bypass
        { name: "Resilience Bypass", file: join(SCRIPTS_DIR, "SHINOBI-RESILIENCE.js") },
    ];

    const scriptResults = [];
    let scriptsRun = 0;
    for (const script of scripts) {
        try { await access(script.file); }
        catch {
            log("warn", `Script not found: ${script.file} — skipping`);
            scriptResults.push({ name: script.name, output: [], success: false, error: "Script file not found" });
            continue;
        }

        notify(`🔬 Running: ${script.name}...`);
        const result = await runFridaScript(packageName, script.file, script.name);
        scriptResults.push(result);
        scriptsRun++;
    }

    // 6. Parse output into structured findings
    const dynamicFindings = scanId ? parseOutputToFindings(scriptResults, scanId) : [];

    // 6b. Detect successful hook installations as additional findings
    if (scanId) {
        const hookFindings = detectHookInstallations(scriptResults, scanId);
        // Only add findings with titles not already present
        const existingTitles = new Set(dynamicFindings.map(f => f.title));
        for (const hf of hookFindings) {
            if (!existingTitles.has(hf.title)) {
                dynamicFindings.push(hf);
            }
        }
    }

    // 7. Build consolidated results
    const fridaResults = {
        timestamp: new Date().toISOString(),
        device: emu.device,
        packageName,
        scriptTimeout: FRIDA_SCRIPT_TIMEOUT,
        scripts: scriptResults.map(r => ({
            name: r.name,
            success: r.success,
            outputLines: r.output.length,
            output: r.output,
            ...(r.error ? { error: r.error } : {}),
        })),
        summary: {
            totalScripts: scripts.length,
            scriptsRun,
            successful: scriptResults.filter(r => r.success).length,
            sslBypasses: countFridaMatches(scriptResults, /\[\+\].*bypass.*ssl|\[\+\].*ssl.*bypass|\[\+\].*pinning.*bypass|\[\+\].*bypass.*pinn/i)
                + dynamicFindings.filter(f => f.category?.includes("SSL Pinning")).length,
            rootBypasses: countFridaMatches(scriptResults, /Bypass root check|Bypass return value|Bypass.*su.*command/i)
                + dynamicFindings.filter(f => f.category?.includes("Root Detection")).length,
            cryptoOps: countFridaMatches(scriptResults, /\[CRYPTO\]/),
            networkCalls: countFridaMatches(scriptResults, /\[NET\]/),
            storageAccess: countFridaMatches(scriptResults, /\[STORAGE\]/),
            authEvents: countFridaMatches(scriptResults, /\[AUTH\]/),
            platformIssues: countFridaMatches(scriptResults, /\[PLATFORM\]/),
            resilienceBypasses: countFridaMatches(scriptResults, /\[RESILIENCE\]/),
            totalHooks: countFridaMatches(scriptResults, /\[\+\]/),
            findingsExtracted: dynamicFindings.length,
        },
    };

    // 8. Save results
    const resultsPath = join(outDir, "frida-results.json");
    await writeFile(resultsPath, JSON.stringify(fridaResults, null, 2), "utf-8");
    log("ok", `Frida results saved: ${resultsPath}`);

    // 9. Cleanup
    notify("🧹 Cleaning up...");
    await uninstallApk(packageName);
    log("ok", "APK uninstalled from emulator");

    return { success: true, results: fridaResults, findings: dynamicFindings };
}
