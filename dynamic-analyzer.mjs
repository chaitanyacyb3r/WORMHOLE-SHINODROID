/**
 * Shinodroid 忍ドロイド — Dynamic Analyzer Module (Frida + ADB)
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
import { writeFile, readFile, readdir, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Frida scripts directory
const SCRIPTS_DIR = join(__dirname, "scripts");

// How long to let each Frida script run before collecting output (ms)
const FRIDA_SCRIPT_TIMEOUT = parseInt(process.env.FRIDA_TIMEOUT_MS || "120000");

// Path to setup-emulator.ps1 (auto-launches emulator + Frida server)
const SETUP_EMULATOR_SCRIPT = join(__dirname, "setup-emulator.ps1");

// ADB command
const ADB = "adb";

// android-unpinner command
const UNPINNER = "android-unpinner";

// Target device serial — set by checkEmulator(), used by adb() to add -s flag
let targetSerial = process.env.ANDROID_SERIAL || null;

/**
 * Build ADB args with -s <serial> when a specific device is targeted.
 * Prevents "more than one device/emulator" errors.
 */
function adb(...args) {
    return targetSerial ? ["-s", targetSerial, ...args] : [...args];
}

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
                targetSerial = parts[0];
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
        const { stdout, stderr } = await execFileAsync(ADB, adb("install", "-r", "-t", apkPath), {
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
        await execFileAsync(ADB, adb("uninstall", packageName), { timeout: 30_000 });
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

// ── SDK-Aware Emulator Selection ────────────────────────────────────────────

/**
 * Extract SDK version metadata from the APK.
 *
 * Resolution order:
 *   1. MobSF report JSON (fastest — already parsed during static phase)
 *   2. aapt2/aapt on PATH
 *   3. aapt2 from Android SDK build-tools directory (Windows/Linux)
 *
 * @param {object|null} mobsfReport
 * @param {string} apkPath
 * @returns {{ minSdk: number|null, targetSdk: number|null, maxSdk: number|null }}
 */
async function extractSdkInfo(mobsfReport, apkPath) {
    const info = { minSdk: null, targetSdk: null, maxSdk: null };

    // ── Source 1: MobSF report ──────────────────────────────────────────
    if (mobsfReport) {
        const min = mobsfReport.min_sdk ?? mobsfReport.minsdk ?? mobsfReport.min_sdk_version;
        const target = mobsfReport.target_sdk ?? mobsfReport.targetsdk ?? mobsfReport.target_sdk_version;
        const max = mobsfReport.max_sdk ?? mobsfReport.maxsdk ?? mobsfReport.max_sdk_version;
        if (min != null) info.minSdk = parseInt(String(min), 10) || null;
        if (target != null) info.targetSdk = parseInt(String(target), 10) || null;
        if (max != null) info.maxSdk = parseInt(String(max), 10) || null;

        if (info.minSdk || info.targetSdk) {
            log("ok", `SDK from MobSF — min=${info.minSdk} target=${info.targetSdk} max=${info.maxSdk}`);
            return info;
        }
    }

    // ── Source 2: aapt2 / aapt on PATH ──────────────────────────────────
    for (const tool of ["aapt2", "aapt"]) {
        try {
            const { stdout } = await execFileAsync(tool, ["dump", "badging", apkPath], { timeout: 30_000 });
            const minMatch = stdout.match(/sdkVersion:'(\d+)'/);
            const targetMatch = stdout.match(/targetSdkVersion:'(\d+)'/);
            const maxMatch = stdout.match(/maxSdkVersion:'(\d+)'/);
            if (minMatch) info.minSdk = parseInt(minMatch[1], 10);
            if (targetMatch) info.targetSdk = parseInt(targetMatch[1], 10);
            if (maxMatch) info.maxSdk = parseInt(maxMatch[1], 10);

            if (info.minSdk || info.targetSdk) {
                log("ok", `SDK from ${tool} — min=${info.minSdk} target=${info.targetSdk} max=${info.maxSdk}`);
                return info;
            }
        } catch { /* tool not on PATH — try next */ }
    }

    // ── Source 3: Android SDK build-tools directory ─────────────────────
    const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
        || (process.platform === "win32"
            ? join(process.env.LOCALAPPDATA || "", "Android", "Sdk")
            : "");
    if (sdkRoot) {
        try {
            const btDir = join(sdkRoot, "build-tools");
            const versions = (await readdir(btDir)).sort().reverse(); // newest first
            for (const ver of versions) {
                const aapt2Path = join(btDir, ver,
                    process.platform === "win32" ? "aapt2.exe" : "aapt2");
                try {
                    await access(aapt2Path);
                    const { stdout } = await execFileAsync(aapt2Path,
                        ["dump", "badging", apkPath], { timeout: 30_000 });
                    const minMatch = stdout.match(/sdkVersion:'(\d+)'/);
                    const targetMatch = stdout.match(/targetSdkVersion:'(\d+)'/);
                    if (minMatch) info.minSdk = parseInt(minMatch[1], 10);
                    if (targetMatch) info.targetSdk = parseInt(targetMatch[1], 10);
                    if (info.minSdk || info.targetSdk) {
                        log("ok", `SDK from ${aapt2Path} — min=${info.minSdk} target=${info.targetSdk}`);
                        return info;
                    }
                } catch { /* this version's aapt2 didn't work — try next */ }
            }
        } catch { /* build-tools dir not found */ }
    }

    log("warn", "Could not extract SDK versions from APK — will use any available emulator");
    return info;
}

/**
 * Query the API level of the currently connected emulator via ADB.
 * @returns {number|null}
 */
async function getEmulatorApiLevel() {
    try {
        const { stdout } = await execFileAsync(ADB,
            adb("shell", "getprop", "ro.build.version.sdk"), { timeout: 10_000 });
        const level = parseInt(stdout.trim(), 10);
        return isNaN(level) ? null : level;
    } catch {
        return null;
    }
}

/**
 * List locally installed AVDs with their API levels.
 *
 * Reads each AVD's config.ini to extract the `target=android-XX` field.
 * Only works on the host machine (not inside Docker).
 *
 * @returns {Array<{ name: string, apiLevel: number }>}
 */
async function listLocalAvds() {
    const avds = [];

    let avdNames;
    try {
        const { stdout } = await execFileAsync("emulator", ["-list-avds"], { timeout: 10_000 });
        avdNames = stdout.trim().split("\n").map(s => s.trim()).filter(Boolean);
    } catch {
        log("info", "emulator CLI not available — cannot list AVDs (expected inside Docker)");
        return avds;
    }

    if (avdNames.length === 0) return avds;

    const avdRoot = join(
        process.env.USERPROFILE || process.env.HOME || "",
        ".android", "avd"
    );

    for (const name of avdNames) {
        const configPath = join(avdRoot, `${name}.avd`, "config.ini");
        try {
            const content = await readFile(configPath, "utf-8");
            // Match: target=android-31  OR  image.sysdir.1=system-images/android-31/...
            const targetMatch = content.match(/^target=android-(\d+)/m);
            const imageDirMatch = content.match(/image\.sysdir\.1=.*android-(\d+)/m);
            const apiLevel = parseInt((targetMatch || imageDirMatch)?.[1], 10);

            if (!isNaN(apiLevel)) {
                avds.push({ name, apiLevel });
                log("info", `  AVD: ${name} → API ${apiLevel}`);
            } else {
                log("warn", `  AVD: ${name} → API unknown (no target= in config)`);
            }
        } catch {
            log("warn", `  AVD: ${name} → config.ini unreadable`);
        }
    }

    return avds;
}

/**
 * Select the best AVD for a given APK's SDK requirements.
 *
 * Selection priority (highest to lowest):
 *   1. Exact match on targetSdkVersion
 *   2. Closest AVD with apiLevel >= targetSdkVersion (prefer lowest above)
 *   3. Closest AVD with apiLevel >= minSdkVersion   (prefer highest below target)
 *   4. Any AVD (absolute last resort)
 *
 * @param {Array<{name: string, apiLevel: number}>} avds
 * @param {{ minSdk: number|null, targetSdk: number|null }} sdkInfo
 * @returns {{ avd: {name: string, apiLevel: number}|null, matchQuality: string }}
 */
function selectBestAvd(avds, sdkInfo) {
    if (avds.length === 0) return { avd: null, matchQuality: "none" };
    if (!sdkInfo.targetSdk && !sdkInfo.minSdk) {
        return { avd: avds[0], matchQuality: "unknown_sdk" };
    }

    const target = sdkInfo.targetSdk || sdkInfo.minSdk;
    const min = sdkInfo.minSdk || target;

    // 1. Exact target match
    const exact = avds.find(a => a.apiLevel === target);
    if (exact) return { avd: exact, matchQuality: "exact" };

    // 2. Closest >= target (prefer lowest above target)
    const aboveTarget = avds
        .filter(a => a.apiLevel >= target)
        .sort((a, b) => a.apiLevel - b.apiLevel);
    if (aboveTarget.length > 0) return { avd: aboveTarget[0], matchQuality: "above_target" };

    // 3. Closest >= min (prefer highest, i.e. closest to target)
    const aboveMin = avds
        .filter(a => a.apiLevel >= min)
        .sort((a, b) => b.apiLevel - a.apiLevel);
    if (aboveMin.length > 0) return { avd: aboveMin[0], matchQuality: "above_min" };

    // 4. Last resort — highest available
    const sorted = [...avds].sort((a, b) => b.apiLevel - a.apiLevel);
    return { avd: sorted[0], matchQuality: "fallback" };
}

/**
 * Validate SDK compatibility between the APK and the running emulator.
 *
 * @param {{ minSdk: number|null, targetSdk: number|null, maxSdk: number|null }} sdkInfo
 * @param {number|null} emulatorApi
 * @returns {{ compatible: boolean, optimal: boolean, warnings: string[] }}
 */
function validateSdkCompatibility(sdkInfo, emulatorApi) {
    const result = { compatible: true, optimal: true, warnings: [] };

    if (!emulatorApi) {
        result.warnings.push("Could not determine emulator API level");
        result.optimal = false;
        return result;
    }

    if (!sdkInfo.minSdk && !sdkInfo.targetSdk) {
        result.warnings.push("SDK versions unknown — compatibility not verified");
        result.optimal = false;
        return result;
    }

    // Hard incompatibility: emulator API < minSdk
    if (sdkInfo.minSdk && emulatorApi < sdkInfo.minSdk) {
        result.compatible = false;
        result.optimal = false;
        result.warnings.push(
            `INCOMPATIBLE: Emulator API ${emulatorApi} < APK minSdkVersion ${sdkInfo.minSdk}. ` +
            `The APK will refuse to install. Create an AVD with API ${sdkInfo.minSdk}+ in Android Studio.`
        );
        return result;
    }

    // Hard incompatibility: emulator API > maxSdk (rare but possible)
    if (sdkInfo.maxSdk && emulatorApi > sdkInfo.maxSdk) {
        result.compatible = false;
        result.optimal = false;
        result.warnings.push(
            `INCOMPATIBLE: Emulator API ${emulatorApi} > APK maxSdkVersion ${sdkInfo.maxSdk}. ` +
            `Create an AVD with API ${sdkInfo.maxSdk} or lower.`
        );
        return result;
    }

    // Suboptimal: emulator API != targetSdk
    if (sdkInfo.targetSdk && emulatorApi !== sdkInfo.targetSdk) {
        result.optimal = false;
        const diff = Math.abs(emulatorApi - sdkInfo.targetSdk);
        if (diff <= 2) {
            result.warnings.push(
                `Emulator API ${emulatorApi} is close to target SDK ${sdkInfo.targetSdk} (±${diff}) — results will be reliable.`
            );
        } else {
            result.warnings.push(
                `Emulator API ${emulatorApi} differs from target SDK ${sdkInfo.targetSdk} by ${diff} levels. ` +
                `For best accuracy, create an API ${sdkInfo.targetSdk} AVD in Android Studio.`
            );
        }
    }

    return result;
}

/**
 * Launch a specific AVD by name using the `emulator` CLI.
 *
 * In Docker environments (detected via ADB_SERVER_SOCKET), logs
 * a recommendation and returns false — the host must start it manually.
 *
 * @param {string} avdName   Exact AVD name from `emulator -list-avds`
 * @param {function} onProgress
 * @returns {boolean}
 */
async function launchSpecificAvd(avdName, onProgress) {
    const notify = onProgress || (() => { });

    // Docker containers cannot launch host emulators
    if (process.env.ADB_SERVER_SOCKET) {
        log("info", `Docker detected — please start AVD "${avdName}" on your host machine`);
        notify(`⚠️ Start AVD "${avdName}" on your host and run: adb -a nodaemon server start`);
        return false;
    }

    notify(`🚀 Launching AVD: ${avdName}...`);
    log("info", `Launching emulator: ${avdName}`);

    try {
        const proc = spawn("emulator", [
            "-avd", avdName,
            "-no-audio",
            "-no-boot-anim",
            "-gpu", "auto",
        ], {
            detached: true,
            stdio: "ignore",
            ...(process.platform === "win32" ? { windowsHide: true } : {}),
        });
        proc.unref();
    } catch (err) {
        log("error", `Failed to launch emulator: ${err.message}`);
        return false;
    }

    // Wait for boot (up to 2 minutes, checking every 5s)
    for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const emu = await checkEmulator();
        if (emu.connected) {
            try {
                const { stdout } = await execFileAsync(ADB,
                    adb("shell", "getprop", "sys.boot_completed"), { timeout: 10_000 });
                if (stdout.trim() === "1") {
                    log("ok", `Emulator fully booted after ${(attempt + 1) * 5}s: ${emu.device}`);
                    return true;
                }
            } catch { /* boot_completed not ready yet */ }
            // After 35s accept a connected device even if boot isn't flagged done
            if (attempt >= 6) {
                log("ok", `Emulator connected after ${(attempt + 1) * 5}s: ${emu.device}`);
                await new Promise(r => setTimeout(r, 3000));
                return true;
            }
        }
        notify(`⏳ Waiting for ${avdName}... (${(attempt + 1) * 5}s)`);
    }

    log("error", `${avdName} did not come online within 2 minutes`);
    return false;
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
    try { await execFileAsync(ADB, adb("root"), { timeout: 10_000 }); } catch { /* ignore */ }

    // Kill any existing (possibly stale) frida-server
    try {
        await execFileAsync(ADB, adb(
            "shell", "pkill -f frida-server"),
            { timeout: 5000 });
        await new Promise(r => setTimeout(r, 1000));
    } catch { /* nothing to kill — that's fine */ }

    // Start fresh frida-server as a daemon
    log("info", "Starting fresh Frida server on emulator...");
    try {
        await execFileAsync(ADB, adb(
            "shell", "nohup /data/local/tmp/frida-server -D > /dev/null 2>&1 &"),
            { timeout: 10_000 });
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
                await execFileAsync(ADB, adb(
                    "shell", "monkey",
                    "-p", packageName,
                    "-c", "android.intent.category.LAUNCHER",
                    "1"
                ), { timeout: 10_000 });
            } catch {
                // monkey failed — try am start with a common activity pattern
                try {
                    await execFileAsync(ADB, adb(
                        "shell", "am", "start",
                        "-n", `${packageName}/.MainActivity`
                    ), { timeout: 10_000 });
                } catch (e) {
                    log("warn", `  Could not launch app: ${e.message}`);
                }
            }

            // Step 2: Wait for app to start, then get PID
            await new Promise(r => setTimeout(r, 3000));

            let fridaArgs;
            try {
                const { stdout: pidOut } = await execFileAsync(ADB, adb(
                    "shell", "pidof", packageName
                ), { timeout: 5000 });
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
 * within the app's content area (y: 250–1650), avoiding the status bar
 * (top ~150px) and navigation bar (bottom ~150px).
 *
 * IMPORTANT: We do NOT send KEYCODE_BACK events — they can push the root
 * activity off-screen and background the app, causing Frida hooks to stop
 * receiving data. A foreground watchdog checks before each batch and
 * re-launches the app if it has been backgrounded.
 */
async function exerciseApp(packageName) {
    try {
        log("info", `Exercising ${packageName} with safe targeted inputs...`);

        // Safe content area boundaries (conservative margins to avoid
        // status bar, navigation bar, and edge gestures)
        const minX = 80, maxX = 1000;
        const minY = 250, maxY = 1650;

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
            const y2 = randInt(1000, 1400);
            // Alternate scroll direction
            actions.push(i % 2 === 0
                ? `input swipe ${x} ${y1} ${x} ${y2} 300`   // scroll up
                : `input swipe ${x} ${y2} ${x} ${y1} 300`); // scroll down
        }

        // NO KEYCODE_BACK — it backgrounds the app from the root activity.
        // Instead, we only use taps and swipes within the app's content area.

        // Shuffle actions for more natural interaction
        for (let i = actions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [actions[i], actions[j]] = [actions[j], actions[i]];
        }

        // Execute in batches with foreground watchdog
        const batchSize = 6;
        for (let i = 0; i < actions.length; i += batchSize) {
            // ── Foreground watchdog ──────────────────────────────────────
            // Before each batch, verify the app is still in the foreground.
            // If it got backgrounded (by an accidental gesture, dialog, etc.),
            // re-launch it immediately.
            await ensureAppForeground(packageName);

            const batch = actions.slice(i, i + batchSize);
            const cmd = batch.join(" && sleep 0.15 && ");
            try {
                await execFileAsync(ADB, adb("shell", cmd), {
                    timeout: 15_000,
                });
            } catch { /* individual batch failure is fine */ }
        }

        log("ok", `App exercised — ${actions.length} safe input events sent`);
    } catch (err) {
        log("info", `Exerciser finished (${err.message?.substring(0, 60) || "done"})`);
    }
}

/**
 * Check if the target app is currently in the foreground.
 * If not, re-launch it via `am start` with the LAUNCHER intent.
 *
 * Uses `dumpsys activity recents` to check the top task's
 * base activity, which is more reliable than `dumpsys window`
 * across different Android/emulator versions.
 */
async function ensureAppForeground(packageName) {
    try {
        // Method 1: Check the currently focused window
        const { stdout: windowInfo } = await execFileAsync(ADB, adb(
            "shell", "dumpsys", "window", "windows"
        ), { timeout: 5_000 });

        // Look for our package in the current focus line
        if (windowInfo.includes(`mCurrentFocus`) || windowInfo.includes(`mFocusedApp`)) {
            const focusLines = windowInfo.split("\n").filter(
                l => l.includes("mCurrentFocus") || l.includes("mFocusedApp")
            );
            const isForeground = focusLines.some(l => l.includes(packageName));
            if (isForeground) return; // App is in front, nothing to do
        }

        // Method 2 (fallback): Check the top activity via recents
        try {
            const { stdout: recents } = await execFileAsync(ADB, adb(
                "shell", "dumpsys", "activity", "recents"
            ), { timeout: 5_000 });
            // The first "Recent #0" entry is the current foreground task
            const topTask = recents.split("Recent #0")[1]?.split("Recent #1")[0] || "";
            if (topTask.includes(packageName)) return; // Still on top
        } catch { /* fallback failed, proceed to relaunch */ }

        // App is NOT in the foreground — bring it back
        log("warn", `⚡ ${packageName} left foreground — re-launching...`);

        // Try the launcher intent first (most reliable way)
        try {
            await execFileAsync(ADB, adb(
                "shell", "am", "start",
                "-a", "android.intent.action.MAIN",
                "-c", "android.intent.category.LAUNCHER",
                "--activity-brought-to-front", "true",
                packageName
            ), { timeout: 8_000 });
        } catch {
            // Fallback: use monkey to launch the default activity
            try {
                await execFileAsync(ADB, adb(
                    "shell", "monkey",
                    "-p", packageName,
                    "-c", "android.intent.category.LAUNCHER",
                    "1"
                ), { timeout: 8_000 });
            } catch {
                // Last resort: direct activity launch
                try {
                    await execFileAsync(ADB, adb(
                        "shell", "am", "start",
                        "-n", `${packageName}/.MainActivity`
                    ), { timeout: 8_000 });
                } catch (e) {
                    log("warn", `Could not re-launch ${packageName}: ${e.message}`);
                }
            }
        }

        // Give the app a moment to come back to the foreground
        await new Promise(r => setTimeout(r, 1500));
        log("ok", `Re-launched ${packageName} into foreground`);

    } catch (err) {
        // Don't fail the exercise loop if the watchdog itself errors
        log("warn", `Foreground check failed: ${err.message?.substring(0, 80)}`);
    }
}

// ── Output Parser ────────────────────────────────────────────────────────────

/**
 * Known-bypassable SSL pinning libraries — sourced from OWASP MSTG,
 * Frida CodeShare, and published Android security research.
 *
 * When a hook installs but doesn't fire (HOOK_INSTALLED_UNCONFIRMED),
 * we use this database to determine severity:
 *   - Libraries with documented, proven Frida bypasses → HIGH
 *   - Less common libraries without extensive bypass documentation → MEDIUM
 *
 * References:
 *   - OWASP Mobile Security Testing Guide: MSTG-NETWORK-3, MSTG-NETWORK-4
 *   - Frida CodeShare: https://codeshare.frida.re/
 *   - NowSecure SSL pinning bypass research
 */
const KNOWN_BYPASSABLE_SSL = {
    'okhttp3.CertificatePinner':                        { severity: 'high', source: 'OWASP MSTG-NETWORK-4, Frida CodeShare' },
    'com.squareup.okhttp.CertificatePinner':             { severity: 'high', source: 'OWASP MSTG, legacy OkHTTP bypass documentation' },
    'com.android.org.conscrypt.TrustManagerImpl':        { severity: 'high', source: 'Android platform, OWASP MSTG-NETWORK-4' },
    'javax.net.ssl.SSLContext':                          { severity: 'high', source: 'Java SSL API, OWASP MSTG-NETWORK-3' },
    'javax.net.ssl.X509TrustManager':                   { severity: 'high', source: 'Java SSL API, OWASP MSTG-NETWORK-3' },
    'com.android.org.conscrypt.CertPinManager':          { severity: 'high', source: 'Android Conscrypt, security research' },
    'com.android.org.conscrypt.OpenSSLSocketImpl':       { severity: 'high', source: 'Conscrypt, Android security research' },
    'com.android.org.conscrypt.OpenSSLEngineSocketImpl': { severity: 'high', source: 'Conscrypt, Android security research' },
    'com.datatheorem.android.trustkit.pinning.PinningTrustManager':   { severity: 'high', source: 'TrustKit documentation, OWASP MSTG' },
    'com.datatheorem.android.trustkit.pinning.OkHostnameVerifier':    { severity: 'high', source: 'TrustKit documentation' },
    'com.squareup.okhttp.internal.tls.OkHostnameVerifier':           { severity: 'high', source: 'OkHTTP, OWASP MSTG' },
    'android.webkit.WebViewClient':                     { severity: 'high', source: 'Android documentation, OWASP MSTG' },
    'appcelerator.https.PinningTrustManager':            { severity: 'medium', source: 'Limited security research' },
    'io.fabric.sdk.android.services.network.PinningTrustManager':    { severity: 'medium', source: 'Firebase/Fabric legacy' },
    'nl.xservices.plugins.sslCertificateChecker':        { severity: 'medium', source: 'PhoneGap/Cordova plugin' },
    'com.worklight.wlclient.api.WLClient':              { severity: 'medium', source: 'IBM MobileFirst documentation' },
    'com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning': { severity: 'medium', source: 'IBM WorkLight documentation' },
    'io.netty.handler.ssl.util.FingerprintTrustManagerFactory':      { severity: 'medium', source: 'Netty documentation' },
    'ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier':        { severity: 'medium', source: 'Third-party HTTP client' },
    'org.apache.http.conn.ssl.AbstractVerifier':         { severity: 'medium', source: 'Apache HTTP Components' },
    'org.chromium.net.impl.CronetEngineBuilderImpl':     { severity: 'medium', source: 'Chromium Cronet' },
    'diefferson.http_certificate_pinning.HttpCertificatePinning':    { severity: 'medium', source: 'Flutter plugin' },
    'com.macif.plugin.sslpinningplugin.SslPinningPlugin':            { severity: 'medium', source: 'Flutter plugin' },
    'com.commonsware.cwac.netsecurity.conscrypt.CertPinManager':     { severity: 'medium', source: 'CWAC Netsecurity' },
    'org.apache.cordova.CordovaWebViewClient':           { severity: 'medium', source: 'Apache Cordova' },
    'com.worklight.androidgap.plugin.WLCertificatePinningPlugin':    { severity: 'medium', source: 'IBM WorkLight' },
    'org.apache.harmony.xnet.provider.jsse.OpenSSLSocketImpl':       { severity: 'medium', source: 'Apache Harmony (legacy)' },
};

/** Look up known bypass severity for a class name extracted from a tag message */
function lookupBypassSeverity(tagMessage) {
    for (const [className, info] of Object.entries(KNOWN_BYPASSABLE_SSL)) {
        // Check if the class name appears in the tag message (e.g., in [DIAG_OBFUSCATION] or hook name)
        if (tagMessage.includes(className)) return info;
    }
    // Also match by library short name from hook names
    if (/OkHTTPv3|okhttp3/i.test(tagMessage)) return { severity: 'high', source: 'OkHTTP3 (OWASP MSTG)' };
    if (/TrustManager.*Android|SSLContext\.init/i.test(tagMessage)) return { severity: 'high', source: 'Android platform SSL' };
    if (/Conscrypt|TrustManagerImpl/i.test(tagMessage)) return { severity: 'high', source: 'Android Conscrypt' };
    if (/Trustkit/i.test(tagMessage)) return { severity: 'high', source: 'TrustKit (OWASP MSTG)' };
    if (/Squareup|OkHostnameVerifier/i.test(tagMessage)) return { severity: 'high', source: 'OkHTTP (OWASP MSTG)' };
    if (/WebViewClient/i.test(tagMessage)) return { severity: 'high', source: 'Android WebView' };
    return { severity: 'medium', source: 'Unknown library — limited bypass documentation' };
}

/**
 * Parse raw Frida output lines into structured findings for the database.
 * Maps common patterns to severity/category/description.
 */
function parseOutputToFindings(scriptResults, scanId) {
    const findings = [];
    const seenTitles = new Set();

    const PATTERNS = [
        // ── SSL/TLS (MASVS-NETWORK) ──────────────────────────────────────
        // ── SSL/TLS CONFIRMED BYPASSES ───────────────────────────────────
        { re: /\[SSL_BYPASS_CONFIRMED\]/i, sev: "high", cat: "SSL Pinning — Confirmed", title: "SSL Pinning Bypass Confirmed", rec: "The Frida hook was invoked on a real call path — this is a confirmed bypass. Implement multi-layer certificate pinning using network security config, Conscrypt, and runtime pin hash verification.", owasp: "M3: Insecure Communication" },

        // ── SSL/TLS HOOK INSTALLED BUT UNVERIFIED ────────────────────────
        // Note: severity is dynamically adjusted by detectHookInstallations based on KNOWN_BYPASSABLE_SSL
        { re: /\[SSL_HOOK_INSTALLED\]/i, sev: "info", cat: "SSL Pinning — Unverified", title: "SSL Hook Installed (Not Yet Verified)", rec: "A Frida hook was installed but not invoked during the monitoring window. See detectHookInstallations for severity-adjusted findings.", owasp: "M3: Insecure Communication" },

        // ── SSL/TLS NOT PRESENT ──────────────────────────────────────────
        { re: /\[SSL_NOT_PRESENT\]/i, sev: "info", cat: "SSL Pinning — Not Present", title: "SSL Pinning Mechanism Not Found", rec: "The target pinning class/method was not found. This may indicate the app does not use this library, or R8/ProGuard obfuscation renamed the class.", owasp: "M3: Insecure Communication" },

        // ── SSL/TLS OBFUSCATED & NATIVE ──────────────────────────────────
        { re: /\[DETECTED_OBFUSCATED_TRUSTMANAGER\]/i, sev: "high", cat: "SSL Pinning — Obfuscated", title: "Obfuscated TrustManager Detected", rec: "An obfuscated custom TrustManager was found. Standard Frida hooks may not work; shape-based detection is required.", owasp: "M3: Insecure Communication" },
        { re: /\[PINNING_ACTIVE\].*Obfuscated TrustManager/i, sev: "high", cat: "SSL Pinning — Obfuscated", title: "Obfuscated TrustManager Active", rec: "An obfuscated custom TrustManager actively intercepted a connection.", owasp: "M3: Insecure Communication" },
        { re: /\[DETECTED_NATIVE_PINNING\]/i, sev: "critical", cat: "SSL Pinning — Native", title: "Native SSL Pinning Detected (BoringSSL/OpenSSL)", rec: "The app registers a custom verify callback at the native layer (C/C++). Java-layer bypasses will fail. Requires native function hooking.", owasp: "M3: Insecure Communication" },
        { re: /\[NATIVE_PINNING_CHECK\]/i, sev: "info", cat: "SSL Pinning — Native", title: "Native SSL Verification Executed", rec: "Observed the native SSL_get_verify_result function being called.", owasp: "M3: Insecure Communication" },

        // ── Legacy [+] SSL patterns (backward compat) ────────────────────
        { re: /\[\+\].*Bypass.*ssl|\[\+\].*ssl.*bypass|\[\+\].*certificate.*pinn|\[\+\].*pinn.*bypass/i, sev: "medium", cat: "SSL Pinning — Unverified", title: "SSL Bypass (Legacy Log — Unverified)", rec: "Detected from a legacy Frida script log format. Hook installation is indicated but runtime interception is not confirmed.", owasp: "M3: Insecure Communication" },
        { re: /\[\+\].*TrustManager|\[\+\].*checkServerTrusted|\[\+\].*SSLContext\.init/i, sev: "medium", cat: "SSL Pinning — Unverified", title: "TrustManager Hook (Legacy Log — Unverified)", rec: "Detected from a legacy Frida script log format. Interception is not confirmed.", owasp: "M3: Insecure Communication" },
        { re: /\[\+\].*OkHttp.*bypass|\[\+\].*okhttp.*pin/i, sev: "medium", cat: "SSL Pinning — Unverified", title: "OkHttp Hook (Legacy Log — Unverified)", rec: "Detected from a legacy Frida script log format. Interception is not confirmed.", owasp: "M3: Insecure Communication" },

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
 * Detect and classify SSL hook outcomes using three-state verification.
 *
 * States:
 *   BYPASS_CONFIRMED  — hook installed AND invoked on a real call (HIGH severity)
 *   HOOK_INSTALLED     — hook installed but NOT invoked during monitoring window
 *                        (severity from KNOWN_BYPASSABLE_SSL: HIGH for proven, MEDIUM for unproven)
 *   NOT_PRESENT        — target class/method not found (INFO severity)
 *
 * Also cross-references network activity from SHINOBI-NETWORK.js to provide
 * diagnostic context when hooks install but don't fire.
 */
function detectHookInstallations(scriptResults, scanId) {
    const findings = [];

    // ── SSL Pinning: Outcome-based verification ─────────────────────────
    // Cross-reference [SSL_HOOK_INSTALLED] vs [SSL_BYPASS_CONFIRMED] tags.
    // Determine severity from KNOWN_BYPASSABLE_SSL database.
    for (const r of scriptResults) {
        if (r.name !== "SSL Pinning Bypass" || !r.success) continue;
        const outputText = r.output.join("\n");

        // Collect confirmed bypasses (hooks that actually fired)
        const confirmedSet = new Set();
        for (const line of r.output) {
            const m = line.match(/\[SSL_BYPASS_CONFIRMED\]\s*(.+?)(?::|$)/);
            if (m) confirmedSet.add(m[1].trim());
        }

        // Process each installed hook
        const installedHooks = [];
        for (const line of r.output) {
            const m = line.match(/\[SSL_HOOK_INSTALLED\]\s*(.+?)\s*—\s*(.+)/);
            if (m) installedHooks.push({ hookName: m[1].trim(), detail: m[2].trim(), line });
        }

        for (const hook of installedHooks) {
            // Check if this hook was also confirmed
            const isConfirmed = confirmedSet.has(hook.hookName);

            if (isConfirmed) {
                findings.push({
                    scan_id: scanId,
                    title: `SSL Bypass Confirmed: ${hook.hookName}`,
                    severity: "high",
                    severity_order: 2,
                    category: "Dynamic — SSL Pinning — Confirmed",
                    description: `Frida Script: SSL Pinning Bypass\nHook on ${hook.detail} was installed AND invoked on a real call path. This is a confirmed, active bypass of SSL certificate pinning.`,
                    recommendation: "Implement multi-layer certificate pinning: network security config with backup pins, OkHttp CertificatePinner, and runtime integrity checks to detect hooking frameworks.",
                    cvss_score: null,
                    owasp_category: "M3: Insecure Communication",
                });
            } else {
                // Not confirmed — look up severity from known-bypassable database
                const known = lookupBypassSeverity(hook.line);
                findings.push({
                    scan_id: scanId,
                    title: `SSL Hook Installed (Unverified): ${hook.hookName}`,
                    severity: known.severity,
                    severity_order: known.severity === "high" ? 2 : 3,
                    category: "Dynamic — SSL Pinning — Unverified",
                    description: `Frida Script: SSL Pinning Bypass\nHook on ${hook.detail} was installed but NOT invoked during the ${FRIDA_SCRIPT_TIMEOUT / 1000}s monitoring window.\n\nThis means the bypass MAY work if the app makes a pinned HTTPS request, but no interception was observed.\n\nSeverity basis: ${known.source}`,
                    recommendation: known.severity === "high"
                        ? "This pinning library has documented, proven Frida bypasses (source: " + known.source + "). The hook is very likely functional but the app did not make a pinned request during testing. Consider extending the monitoring window or triggering app network activity."
                        : "This pinning library has limited bypass documentation. The hook installed but may not be on the correct call path. Consider manual verification.",
                    cvss_score: null,
                    owasp_category: "M3: Insecure Communication",
                });
            }
        }

        // Detect NOT_PRESENT with obfuscation context
        for (const line of r.output) {
            const m = line.match(/\[SSL_NOT_PRESENT\]\s*(.+?)\s*—\s*(.+)/);
            if (!m) continue;
            const hookName = m[1].trim();
            const className = m[2].trim();

            // Check if there's a matching DIAG_OBFUSCATION line
            const hasObfuscationHint = outputText.includes('[DIAG_OBFUSCATION] ' + className.split(' ')[0]);

            findings.push({
                scan_id: scanId,
                title: `SSL Pinning Not Present: ${hookName}`,
                severity: "info",
                severity_order: 5,
                category: "Dynamic — SSL Pinning — Not Present",
                description: `Frida Script: SSL Pinning Bypass\nThe target class ${className} was not found in the application.` +
                    (hasObfuscationHint ? `\n\n⚠️ This may indicate R8/ProGuard obfuscation renamed the class. Check the app's mapping.txt for the obfuscated name. Obfuscation-proof hooking is not attempted in this scan.` : ''),
                recommendation: "No action needed if the app does not use this pinning library. If the app does use this library but the class was renamed by obfuscation, a custom Frida script targeting the obfuscated name is required.",
                cvss_score: null,
                owasp_category: "M3: Insecure Communication",
            });
        }

        // ── Cross-reference with network activity ────────────────────────
        // Check SHINOBI-NETWORK.js output to distinguish "no network activity"
        // from "network activity but hooks didn't fire" (ClassLoader mismatch)
        if (installedHooks.length > 0 && confirmedSet.size === 0) {
            const networkCallsObserved = scriptResults.some(sr =>
                sr.name === "Network Monitor" && sr.output.some(l => /\[NET\]/.test(l))
            );
            const classLoaderMismatch = r.output.some(l => /\[DIAG_CLASSLOADER_MISMATCH\]/.test(l));

            if (classLoaderMismatch) {
                findings.push({
                    scan_id: scanId,
                    title: "⚠️ ClassLoader Mismatch Detected",
                    severity: "medium",
                    severity_order: 3,
                    category: "Dynamic — SSL Pinning — Diagnostic",
                    description: `SSL hooks were installed but the hooked class was found in MULTIPLE ClassLoaders. The app may be loading the pinning class from a different ClassLoader than the one Frida hooked. Check [DIAG_CLASSLOADER_MISMATCH] lines in the script output for details.`,
                    recommendation: "Use Java.enumerateClassLoadersSync() to find the correct ClassLoader and hook the class via Java.ClassFactory.get(loader).use('className').",
                    cvss_score: null,
                    owasp_category: "M3: Insecure Communication",
                });
            } else if (!networkCallsObserved) {
                findings.push({
                    scan_id: scanId,
                    title: "ℹ️ No Network Activity During Monitoring",
                    severity: "info",
                    severity_order: 5,
                    category: "Dynamic — SSL Pinning — Diagnostic",
                    description: `${installedHooks.length} SSL pinning hooks were installed but no network calls were observed during the ${FRIDA_SCRIPT_TIMEOUT / 1000}s monitoring window. The app may not have made any HTTPS requests during testing. The bypasses could not be verified.`,
                    recommendation: "Extend the monitoring window (increase FRIDA_SCRIPT_TIMEOUT) or trigger app network activity during the scan (e.g., UI automation to navigate to a login screen).",
                    cvss_score: null,
                    owasp_category: "M3: Insecure Communication",
                });
            } else {
                findings.push({
                    scan_id: scanId,
                    title: "⚠️ Network Activity Observed But Hooks Did Not Fire",
                    severity: "medium",
                    severity_order: 3,
                    category: "Dynamic — SSL Pinning — Diagnostic",
                    description: `${installedHooks.length} SSL pinning hooks were installed and network calls were observed, but no hook intercepted a real call. This may indicate the app uses a different code path, a different ClassLoader, or AOT-compiled code that bypasses the hooked method.`,
                    recommendation: "Check [DIAG_CLASSLOADER] and [DIAG_AOT] output lines for diagnostic context. The app may need a custom Frida script targeting the actual code path.",
                    cvss_score: null,
                    owasp_category: "M3: Insecure Communication",
                });
            }
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

    // 1. Extract SDK version requirements from APK
    notify("📋 Extracting SDK version info...");
    const sdkInfo = await extractSdkInfo(mobsfReport, apkPath);
    log("info", `APK SDK: min=${sdkInfo.minSdk || "?"} target=${sdkInfo.targetSdk || "?"} max=${sdkInfo.maxSdk || "any"}`);

    // 2. Check emulator — attempt SDK-aware auto-launch if not found
    notify("🔌 Checking emulator connection...");
    let emu = await checkEmulator();
    let emulatorApi = null;
    let sdkCompat = null;

    if (!emu.connected) {
        // No emulator running — try SDK-aware launch first
        const avds = await listLocalAvds();
        if (avds.length > 0 && (sdkInfo.targetSdk || sdkInfo.minSdk)) {
            const { avd: bestAvd, matchQuality } = selectBestAvd(avds, sdkInfo);
            if (bestAvd) {
                notify(`🚀 Launching ${bestAvd.name} (API ${bestAvd.apiLevel}, match: ${matchQuality})...`);
                log("info", `SDK-aware AVD selection: ${bestAvd.name} (API ${bestAvd.apiLevel}) — match: ${matchQuality}`);
                const launched = await launchSpecificAvd(bestAvd.name, notify);
                if (launched) emu = await checkEmulator();
            }
        }
        // Fallback to legacy launch if SDK-aware selection didn't work
        if (!emu.connected) {
            notify("⚙️ Attempting generic emulator launch...");
            const launched = await launchEmulator(notify);
            if (launched) emu = await checkEmulator();
        }
    }

    if (!emu.connected) {
        log("warn", "No emulator connected — skipping dynamic analysis");
        const recommendation = sdkInfo.targetSdk
            ? `Create an AVD with API ${sdkInfo.targetSdk} in Android Studio → Tools → Device Manager.`
            : "Create an AVD in Android Studio → Tools → Device Manager.";
        return {
            success: false,
            error: `No emulator connected. ${recommendation}`,
            skipped: true,
            sdkInfo,
        };
    }

    // Validate SDK compatibility with the running emulator
    emulatorApi = await getEmulatorApiLevel();
    sdkCompat = validateSdkCompatibility(sdkInfo, emulatorApi);
    log("ok", `Emulator connected: ${emu.device} (API ${emulatorApi || "unknown"})`);

    if (!sdkCompat.compatible) {
        for (const w of sdkCompat.warnings) {
            log("error", w);
            notify(`❌ ${w}`);
        }
        // Proceed anyway — APK install will fail naturally if truly incompatible
    } else if (!sdkCompat.optimal) {
        for (const w of sdkCompat.warnings) {
            log("warn", w);
            notify(`⚠️ ${w}`);
        }
    } else {
        log("ok", `SDK compatibility: ✅ Optimal (emulator API ${emulatorApi} = target ${sdkInfo.targetSdk})`);
    }

    // 3. Get package name
    const packageName = await getPackageName(mobsfReport, apkPath);
    if (!packageName) {
        return {
            success: false,
            error: "Could not determine package name. Ensure aapt is in PATH or MobSF report has package_name.",
        };
    }
    log("info", `Package: ${packageName}`);

    // 3b. Try to patch APK with android-unpinner
    notify("🔧 Attempting to patch APK with android-unpinner (best-effort)...");
    let installApkPath = apkPath;
    let unpinnerSuccess = false;
    const expectedPatchedPath = apkPath.replace(/\.apk$/i, ".unpinned.apk");
    
    try {
        await execFileAsync(UNPINNER, ["patch-apks", "--force", apkPath], { timeout: 120_000 });
    } catch (e) {
        // android-unpinner has a known bug on Windows where it crashes trying to print a 🎉 emoji at the very end
        // Even if it throws, the patching might have succeeded. We will ignore the error here and just check if the file exists.
        log("info", `android-unpinner exited with error/crash (often expected on Windows due to emoji print): ${e.message.split("\\n")[0]}`);
    }

    try {
        await access(expectedPatchedPath); // Check if the patched file was actually created
        installApkPath = expectedPatchedPath;
        unpinnerSuccess = true;
        log("ok", `Successfully patched APK with android-unpinner: ${installApkPath}`);
    } catch (err) {
        log("warn", "android-unpinner did not produce the patched APK, falling back to original");
    }

    // 4. Install APK
    notify(`📲 Installing APK on emulator (${unpinnerSuccess ? "patched" : "original"})...`);
    const installResult = await installApk(installApkPath);
    if (!installResult.success) {
        log("error", `APK install failed: ${installResult.error}`);
        return { success: false, error: `APK install failed: ${installResult.error}` };
    }
    log("ok", "APK installed on emulator");

    // ── UI Exploration Setup ─────────────────────────────────────
    let uiExplorerModule = null;
    let customHooksModule = null;
    try {
        uiExplorerModule = await import("./ui-explorer.mjs");
    } catch (e) {
        log("warn", `Could not load ui-explorer.mjs: ${e.message}`);
    }
    try {
        customHooksModule = await import("./custom-hooks-generator.mjs");
    } catch (e) {
        log("warn", `Could not load custom-hooks-generator.mjs: ${e.message}`);
    }

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
        // MASVS-NETWORK — HTTPToolkit SSL Pinning Bypass (from android-unpinner)
        { name: "HTTPToolkit SSL Bypass", file: join(SCRIPTS_DIR, "HTTPTOOLKIT-UNPINNER.js") },
        // MASVS-NETWORK — Obfuscated/Native SSL Pinning Detection
        { name: "SSL Obfuscated/Native Detection", file: join(SCRIPTS_DIR, "SSL-DETECT-OBFUSCATED.js") },
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

    // Append AI-free custom hooks from MobSF analysis
    let customScriptsCount = 0;
    if (mobsfReport && customHooksModule) {
        try {
            const customScripts = await customHooksModule.generateCustomHooks(mobsfReport, outDir, packageName);
            scripts.push(...customScripts);
            customScriptsCount = customScripts.length;
            log("info", `Generated ${customScripts.length} custom Frida hooks from static analysis`);
        } catch (e) {
            log("warn", `Failed to generate custom hooks: ${e.message}`);
        }
    }

    const scriptResults = [];
    let scriptsRun = 0;
    for (const script of scripts) {
        if (script.name === "HTTPToolkit SSL Bypass") {
            notify(`🔬 Running: ${script.name} (via android-unpinner)...`);
            log("info", "Executing android-unpinner for SSL pinning bypass...");
            const output = [];
            try {
                // Clear logcat (ignore errors if it fails to clear some buffers)
                try {
                    await execFileAsync(ADB, adb("logcat", "-c"));
                } catch (e) {
                    log("info", "logcat -c encountered an error, but continuing...");
                }
                
                // Spawn android-unpinner all
                const child = spawn(UNPINNER, ["all", "--force", apkPath], { stdio: "pipe" });
                
                // Programmatically answer the prompt "Continue? [y/N]:"
                child.stdin.write("y\n");
                child.stdin.end();
                
                // Wait for the tool to finish injecting the gadget
                await new Promise((resolve) => {
                    let done = false;
                    const finish = () => { if (!done) { done = true; resolve(); } };
                    child.on("close", finish);
                    child.on("error", finish);
                    
                    // Failsafe timeout in case android-unpinner hangs
                    setTimeout(() => {
                        try { child.kill("SIGTERM"); } catch (e) {}
                        finish();
                    }, 45000);
                });
                
                // Wait briefly for app to fully initialize
                await new Promise(r => setTimeout(r, 5000));
                
                // Run monkey to trigger HTTP requests
                exerciseApp(packageName).catch(() => {});
                
                // Wait for FRIDA_SCRIPT_TIMEOUT
                await new Promise(r => setTimeout(r, FRIDA_SCRIPT_TIMEOUT));
                
                // Dump logcat to capture the Gadget's console.log outputs
                const { stdout } = await execFileAsync(ADB, adb("logcat", "-d"));
                const relevantLines = stdout.split("\n").filter(l => 
                    l.includes("[SSL_") || l.includes("[DIAG_") || l.includes("[!]") || l.includes("HTTPToolkit")
                );
                output.push(...relevantLines);
                
                // Force-stop the app
                await execFileAsync(ADB, adb("shell", "am", "force-stop", packageName));
                
                scriptResults.push({ name: script.name, output, success: true });
            } catch (e) {
                log("warn", `android-unpinner execution failed: ${e.message}`);
                scriptResults.push({ name: script.name, output: [`Error: ${e.message}`], success: false });
            }
            scriptsRun++;
            continue;
        }

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

    // ── UI Exploration (after Frida hooks) ────────────────────
    let uiResults = null;
    if (uiExplorerModule) {
        try {
            uiResults = await uiExplorerModule.exploreApp(packageName, {
                zapProxy: true,
                log,
                callLLM: null // LLM login is optional; orchestrator-level context not available here
            });
        } catch (e) {
            log("warn", `UI Explorer failed: ${e.message}`);
        }
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
        sdkInfo,
        emulatorApiLevel: emulatorApi,
        unpinnerPatchSuccess: unpinnerSuccess,
        sdkCompatibility: sdkCompat ? {
            compatible: sdkCompat.compatible,
            optimal: sdkCompat.optimal,
            warnings: sdkCompat.warnings,
        } : null,
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
            // Confirmed bypasses only — hooks that intercepted real calls
            sslBypassesConfirmed: countFridaMatches(scriptResults, /\[SSL_BYPASS_CONFIRMED\]/),
            // Hooks installed but not invoked during monitoring window
            sslHooksUnconfirmed: countFridaMatches(scriptResults, /\[SSL_HOOK_INSTALLED\]/),
            // Mechanisms not found in the app
            sslNotPresent: countFridaMatches(scriptResults, /\[SSL_NOT_PRESENT\]/),
            // Backward compat: old field now equals confirmed only (was previously inflated by double-counting)
            sslBypasses: countFridaMatches(scriptResults, /\[SSL_BYPASS_CONFIRMED\]/),
            rootBypasses: countFridaMatches(scriptResults, /Bypass root check|Bypass return value|Bypass.*su.*command/i)
                + dynamicFindings.filter(f => f.category?.includes("Root Detection")).length,
            cryptoOps: countFridaMatches(scriptResults, /\[CRYPTO\]/),
            networkCalls: countFridaMatches(scriptResults, /\[NET\]/),
            storageAccess: countFridaMatches(scriptResults, /\[STORAGE\]/),
            authEvents: countFridaMatches(scriptResults, /\[AUTH\]/),
            platformIssues: countFridaMatches(scriptResults, /\[PLATFORM\]/),
            resilienceBypasses: countFridaMatches(scriptResults, /\[RESILIENCE\]/),
            totalHooks: countFridaMatches(scriptResults, /\[\+\]|\[SSL_HOOK_INSTALLED\]|\[SSL_BYPASS_CONFIRMED\]/),
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
