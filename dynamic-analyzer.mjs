/**
 * Dynamic Analyzer Module — Frida + ADB Automation
 *
 * Automates dynamic analysis of Android APKs:
 *   1. Checks for connected emulator via ADB
 *   2. Installs APK on emulator
 *   3. Extracts package name (from MobSF report or aapt)
 *   4. Ensures Frida server is running
 *   5. Runs Frida scripts (SSL bypass, root bypass, combined)
 *   6. Captures output and saves to frida-results.json
 *   7. Cleans up (uninstalls APK)
 *
 * Prerequisites:
 *   - Android emulator running and rooted (use BrutDroid for one-time setup)
 *   - Frida server installed on emulator (BrutDroid Menu 4 → Install Frida Server)
 *   - adb and frida CLI tools in PATH
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
const FRIDA_SCRIPT_TIMEOUT = 20_000; // 20 seconds

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
 * @returns {Promise<{connected: boolean, device: string|null}>}
 */
export async function checkEmulator() {
    try {
        const { stdout } = await execFileAsync(ADB, ["devices"], { timeout: 10_000 });
        const lines = stdout.trim().split("\n").slice(1); // skip header
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
 * Install an APK on the connected emulator.
 * @param {string} apkPath - Path to the APK file
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function installApk(apkPath) {
    try {
        const { stdout, stderr } = await execFileAsync(ADB, ["install", "-r", "-t", apkPath], {
            timeout: 120_000, // 2 min for large APKs
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
 * @param {string} packageName
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
 * @param {object|null} mobsfReport - MobSF JSON report (may have package_name)
 * @param {string} apkPath - Path to the APK file
 * @returns {Promise<string|null>}
 */
async function getPackageName(mobsfReport, apkPath) {
    // 1. Try MobSF report
    if (mobsfReport?.package_name) {
        return mobsfReport.package_name;
    }

    // 2. Try aapt dump
    try {
        const { stdout } = await execFileAsync("aapt", ["dump", "badging", apkPath], {
            timeout: 30_000,
        });
        const match = stdout.match(/package:\s+name='([^']+)'/);
        if (match) return match[1];
    } catch {
        // aapt not available
    }

    // 3. Try aapt2
    try {
        const { stdout } = await execFileAsync("aapt2", ["dump", "badging", apkPath], {
            timeout: 30_000,
        });
        const match = stdout.match(/package:\s+name='([^']+)'/);
        if (match) return match[1];
    } catch {
        // aapt2 not available
    }

    return null;
}

// ── Frida Helpers ───────────────────────────────────────────────────────────

/**
 * Ensure Frida server is running on the emulator.
 * Same approach as BrutDroid's run_frida_server().
 */
async function ensureFridaServer() {
    // Check if frida-server is already running
    try {
        const { stdout } = await execFileAsync(ADB, [
            "shell", "su", "-c", "ps | grep frida-server"
        ], { timeout: 10_000 });
        if (stdout.includes("frida-server")) {
            log("ok", "Frida server already running");
            return true;
        }
    } catch {
        // Not running, try to start
    }

    // Start frida-server in background (same command as BrutDroid)
    try {
        log("info", "Starting Frida server on emulator...");
        await execFileAsync(ADB, [
            "shell", "su", "-c", "nohup /data/local/tmp/frida-server > /dev/null 2>&1 &"
        ], { timeout: 10_000 });
        // Wait for server to be ready
        await new Promise(r => setTimeout(r, 3000));
        log("ok", "Frida server started");
        return true;
    } catch (err) {
        log("error", "Failed to start Frida server: " + err.message);
        return false;
    }
}

/**
 * Run a single Frida script against a package and capture output.
 * @param {string} packageName - Target app package name
 * @param {string} scriptPath - Absolute path to the .js script
 * @param {string} scriptName - Human-readable name
 * @returns {Promise<{name: string, output: string[], success: boolean, error?: string}>}
 */
function runFridaScript(packageName, scriptPath, scriptName) {
    return new Promise((resolve) => {
        const output = [];
        let timedOut = false;

        log("info", `Running ${scriptName} against ${packageName}...`);

        // Spawn frida with the script
        //   frida -U -f <package> -l <script>
        const proc = spawn("frida", [
            "-U",           // USB/emulator
            "-f", packageName,  // spawn app
            "-l", scriptPath,   // load script
        ], {
            stdio: ["pipe", "pipe", "pipe"],
            timeout: FRIDA_SCRIPT_TIMEOUT + 5000,
        });

        proc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n").filter(l => l.trim());
            output.push(...lines);
        });

        proc.stderr.on("data", (data) => {
            const lines = data.toString().split("\n").filter(l => l.trim());
            output.push(...lines);
        });

        // Let the script run for FRIDA_SCRIPT_TIMEOUT, then kill
        const timer = setTimeout(() => {
            timedOut = true;
            try { proc.kill("SIGTERM"); } catch { /* ignore */ }
        }, FRIDA_SCRIPT_TIMEOUT);

        proc.on("close", (code) => {
            clearTimeout(timer);
            const success = timedOut || code === 0;
            log(success ? "ok" : "warn", `${scriptName}: ${output.length} lines captured (exit: ${timedOut ? "timeout" : code})`);
            resolve({
                name: scriptName,
                output,
                success,
                ...((!success && !timedOut) ? { error: `Exit code ${code}` } : {}),
            });
        });

        proc.on("error", (err) => {
            clearTimeout(timer);
            log("error", `${scriptName} error: ${err.message}`);
            resolve({
                name: scriptName,
                output,
                success: false,
                error: err.message,
            });
        });
    });
}

// ── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Run dynamic analysis on an APK file.
 *
 * @param {string} apkPath - Absolute path to the APK file on disk
 * @param {string} outDir - Directory to save results
 * @param {object|null} mobsfReport - MobSF JSON report (for package name extraction)
 * @param {function|null} onProgress - Progress callback
 * @returns {Promise<{success: boolean, results?: object, error?: string}>}
 */
export async function runDynamicAnalysis(apkPath, outDir, mobsfReport = null, onProgress = null) {
    const notify = onProgress || (() => { });

    // 1. Check emulator
    notify("🔌 Checking emulator connection...");
    const emu = await checkEmulator();
    if (!emu.connected) {
        log("warn", "No emulator connected — skipping dynamic analysis");
        return {
            success: false,
            error: "No emulator connected. Start an Android emulator and try again.",
            skipped: true,
        };
    }
    log("ok", `Emulator connected: ${emu.device}`);

    // 2. Get package name
    const packageName = await getPackageName(mobsfReport, apkPath);
    if (!packageName) {
        log("error", "Could not determine package name — skipping dynamic analysis");
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
            error: "Could not start Frida server. Ensure it is installed on the emulator (BrutDroid → Configure Emulator → Install Frida Server).",
        };
    }

    // 5. Run Frida scripts
    const scripts = [
        { name: "SSL Pinning Bypass (SSL-BYE)", file: join(SCRIPTS_DIR, "SSL-BYE.js") },
        { name: "Root Detection Bypass (ROOTER)", file: join(SCRIPTS_DIR, "ROOTER.js") },
        { name: "Combined Bypass (PintooR)", file: join(SCRIPTS_DIR, "PintooR.js") },
    ];

    const scriptResults = [];
    for (const script of scripts) {
        // Verify script file exists
        try {
            await access(script.file);
        } catch {
            log("warn", `Script not found: ${script.file} — skipping`);
            scriptResults.push({
                name: script.name,
                output: [],
                success: false,
                error: "Script file not found",
            });
            continue;
        }

        notify(`🔬 Running: ${script.name}...`);
        const result = await runFridaScript(packageName, script.file, script.name);
        scriptResults.push(result);
    }

    // 6. Build consolidated results
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
            successful: scriptResults.filter(r => r.success).length,
            sslBypasses: countFridaMatches(scriptResults, /\[+\+\].*[Bb]ypass/i),
            rootBypasses: countFridaMatches(scriptResults, /[Bb]ypass.*(root|su|magisk)/i),
            totalHooks: countFridaMatches(scriptResults, /\[\+\]/),
        },
    };

    // 7. Save results
    const resultsPath = join(outDir, "frida-results.json");
    await writeFile(resultsPath, JSON.stringify(fridaResults, null, 2), "utf-8");
    log("ok", `Frida results saved: ${resultsPath}`);

    // 8. Cleanup — uninstall APK
    notify("🧹 Cleaning up...");
    await uninstallApk(packageName);
    log("ok", "APK uninstalled from emulator");

    return { success: true, results: fridaResults };
}

/**
 * Count regex matches across all Frida script outputs.
 */
function countFridaMatches(scriptResults, pattern) {
    let count = 0;
    for (const r of scriptResults) {
        for (const line of r.output) {
            if (pattern.test(line)) count++;
        }
    }
    return count;
}
