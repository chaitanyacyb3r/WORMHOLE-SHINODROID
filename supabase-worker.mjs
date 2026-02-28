import { readFile, stat, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { runAllEngines } from "./orchestrator.mjs";

config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to run the worker.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function log(level, msg) {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const prefix = { info: "ℹ️", ok: "✅", warn: "⚠️", error: "❌", step: "➡️" }[level] || "•";
    console.log(`[${ts}] ${prefix} ${msg}`);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function elapsed(startMs) {
    const ms = Date.now() - startMs;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

// ── WARP Auto-Connect ────────────────────────────────────────────────────────
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const WARP_CLI = "C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe";

let warpAvailable = null; // null = unchecked, true/false = known

async function isWarpInstalled() {
    if (warpAvailable !== null) return warpAvailable;
    try {
        await access(WARP_CLI);
        warpAvailable = true;
    } catch {
        warpAvailable = false;
    }
    return warpAvailable;
}

async function getWarpStatus() {
    try {
        const { stdout } = await execFileAsync(WARP_CLI, ["status"]);
        if (stdout.includes("Connected")) return "connected";
        return "disconnected";
    } catch {
        return "unknown";
    }
}

async function connectWarp() {
    try {
        log("info", "🌐 Auto-connecting Cloudflare WARP...");
        const { stdout } = await execFileAsync(WARP_CLI, ["connect"]);
        if (stdout.includes("Success")) {
            log("ok", "WARP connected successfully");
            // Wait a moment for the tunnel to stabilize
            await new Promise(r => setTimeout(r, 2000));
            return true;
        }
        log("warn", `WARP connect response: ${stdout.trim()}`);
        return false;
    } catch (err) {
        log("error", `WARP connect failed: ${err.message}`);
        return false;
    }
}

/**
 * Test if Supabase is reachable. If not, try to auto-connect WARP.
 * Returns true if connectivity is OK (or was fixed), false if still broken.
 */
async function ensureConnectivity() {
    // Quick connectivity test using raw fetch (more reliable than Supabase client for timeout)
    try {
        const start = Date.now();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/scans?select=id&limit=1`, {
            headers: {
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            signal: AbortSignal.timeout(6000),
        });
        const ms = Date.now() - start;
        if (res.ok) {
            log("ok", `Supabase connected successfully (${ms}ms)`);
            return true;
        }
    } catch {
        // Fall through to WARP check
    }

    // Supabase is unreachable — try WARP
    log("warn", "Supabase unreachable from Node.js (ISP may be blocking Cloudflare)");

    if (!(await isWarpInstalled())) {
        log("error", "Cloudflare WARP is not installed. Install it from https://1.1.1.1/");
        log("error", "Your ISP blocks direct connections to Supabase. WARP tunnels around this.");
        return false;
    }

    const status = await getWarpStatus();
    if (status === "connected") {
        // WARP is connected but routes are stale — do a full reconnect cycle
        log("warn", "WARP connected but Supabase unreachable — cycling WARP connection...");
        try {
            await execFileAsync(WARP_CLI, ["disconnect"]);
            await new Promise(r => setTimeout(r, 2000)); // wait for disconnect
        } catch { /* ignore disconnect errors */ }
    }

    // Auto-connect WARP
    const connected = await connectWarp();
    if (!connected) return false;

    // Verify connectivity after WARP
    try {
        const start = Date.now();
        const { error } = await supabase.from("scans").select("id").limit(1);
        const ms = Date.now() - start;
        if (!error) {
            log("ok", `Supabase now reachable via WARP (${ms}ms)`);
            return true;
        }
        log("error", `Still can't reach Supabase after WARP: ${error.message}`);
        return false;
    } catch (err) {
        log("error", `Connectivity check failed after WARP: ${err.message}`);
        return false;
    }
}



// ── Helpers ──────────────────────────────────────────────────────────────────

async function insertFindings(findingsToInsert) {
    if (findingsToInsert.length === 0) return;
    const chunkSize = 100;
    for (let i = 0; i < findingsToInsert.length; i += chunkSize) {
        const chunk = findingsToInsert.slice(i, i + chunkSize);
        const { error: insertErr } = await supabase.from("findings").insert(chunk);
        if (insertErr) log("warn", `Failed to insert findings chunk: ${insertErr.message}`);
    }
    log("ok", `Inserted ${findingsToInsert.length} findings`);
}

async function uploadToStorage(localPath, storagePath, contentType) {
    try {
        await stat(localPath);
        const buffer = await readFile(localPath);
        const { error: uploadErr } = await supabase.storage
            .from("apks")
            .upload(storagePath, buffer, { contentType, upsert: true });
        if (uploadErr) {
            log("warn", `Storage upload failed (${storagePath}): ${uploadErr.message}`);
            return null;
        }
        log("ok", `Uploaded → ${storagePath}`);
        return storagePath;
    } catch (e) {
        log("warn", `File not found for upload (${localPath}): ${e.message}`);
        return null;
    }
}

// ── Main scan processor ───────────────────────────────────────────────────────

async function processScan(scan) {
    const jobStart = Date.now();
    console.log();
    log("info", `╔══════════════════════════════════════════════════════════╗`);
    log("info", `║  NEW JOB: ${scan.file_name.padEnd(45)}║`);
    log("info", `║  Scan ID: ${scan.id}   ║`);
    log("info", `║  Size: ${formatBytes(scan.file_size || 0).padEnd(48)}║`);
    log("info", `╚══════════════════════════════════════════════════════════╝`);

    try {
        // ── Step 1: Update status ────────────────────────────────────────────
        log("step", "[1/6] Updating scan status → scanning...");
        await supabase.from("scans")
            .update({ status: "scanning", dynamic_status: "pending" })
            .eq("id", scan.id);
        log("ok", "Scan status updated");

        // ── Step 2: Download APK ─────────────────────────────────────────────
        log("step", `[2/6] Downloading APK from storage: ${scan.file_path}`);
        const dlStart = Date.now();
        const { data: fileBlob, error: downloadErr } = await supabase
            .storage.from("apks").download(scan.file_path);
        if (downloadErr) throw new Error(`Download failed: ${downloadErr.message}`);

        const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
        log("ok", `Downloaded ${formatBytes(fileBuffer.length)} in ${elapsed(dlStart)}`);

        // ── Step 3: Write APK to temp ────────────────────────────────────────
        const tempApkPath = join(tmpdir(), `shinobidroid-${scan.id}.apk`);
        await writeFile(tempApkPath, fileBuffer);
        log("step", `[3/6] APK written to: ${tempApkPath}`);

        try {
            // ── Step 4: Run ALL engines ──────────────────────────────────────
            log("step", "[4/6] Launching engine orchestrator...");

            const { mkdirSync } = await import("node:fs");
            const reportsDir = process.env.REPORTS_OUTPUT_DIR || "C:\\MobSF-Scans\\reports";
            const outDir = join(reportsDir, scan.id);
            try { mkdirSync(outDir, { recursive: true }); } catch { /* exists */ }
            log("info", `Reports directory: ${outDir}`);

            const engineContext = {
                scanId: scan.id,
                outDir,
                fileName: scan.file_name,
                mobsfReport: null,
                packageName: null,
                allFindings: [],
                endpoints: [],
                log: (level, msg) => log(level, `  ${msg}`),
                onProgress: (msg) => log("info", `  ${msg}`),
            };

            const engineStart = Date.now();
            const result = await runAllEngines(tempApkPath, engineContext);
            log("ok", `All engines finished in ${elapsed(engineStart)}`);

            // ── Step 5: Save findings ────────────────────────────────────────
            log("step", `[5/6] Saving ${result.findings.length} findings to Supabase...`);
            if (result.findings.length > 0) {
                await insertFindings(result.findings);
            } else {
                log("warn", "No findings to insert");
            }

            // ── Build severity counts ────────────────────────────────────────
            const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
            for (const f of result.findings) {
                if (counts[f.severity] !== undefined) counts[f.severity]++;
            }

            // ── Per-engine breakdown ─────────────────────────────────────────
            const engineBreakdown = {};
            for (const f of result.findings) {
                engineBreakdown[f.engine] = (engineBreakdown[f.engine] || 0) + 1;
            }
            for (const [eng, count] of Object.entries(engineBreakdown)) {
                log("info", `  📊 ${eng}: ${count} findings`);
            }

            // ── Extract engine-specific data ─────────────────────────────────
            const mobsfEngine = result.engines.find(e => e.engine === "mobsf");
            const fridaEngine = result.engines.find(e => e.engine === "frida");

            const reportJson = mobsfEngine?.success ? {
                security_score: mobsfEngine.metadata?.securityScore || 0,
                average_cvss: mobsfEngine.metadata?.averageCvss || 0,
                app_name: mobsfEngine.metadata?.appName || scan.file_name,
                package_name: mobsfEngine.metadata?.packageName || "Unknown",
                version_name: mobsfEngine.metadata?.versionName || "Unknown",
                mobsf_hash: mobsfEngine.metadata?.hash || null,
            } : {};

            if (mobsfEngine?.success) {
                log("ok", `MobSF: app=${reportJson.app_name}, pkg=${reportJson.package_name}, score=${reportJson.security_score}`);
            }

            // ── Upload reports ────────────────────────────────────────────────
            log("step", "[6/6] Uploading reports to storage...");

            let pdfStoragePath = null;
            if (mobsfEngine?.metadata?.outDir) {
                try {
                    pdfStoragePath = await uploadToStorage(
                        join(mobsfEngine.metadata.outDir, "report.pdf"),
                        `${scan.user_id}/reports/${scan.id}.pdf`,
                        "application/pdf"
                    );
                    if (pdfStoragePath) log("ok", `Static PDF uploaded`);
                } catch { log("warn", "Static PDF not found, skipping"); }
            }

            let dynamicPdfPath = null;
            if (fridaEngine?.success && fridaEngine.metadata?.fridaResults) {
                try {
                    await uploadToStorage(
                        join(outDir, "frida-results.json"),
                        `${scan.user_id}/reports/${scan.id}-frida.json`,
                        "application/json"
                    );
                    log("ok", "Frida results JSON uploaded");
                } catch { log("warn", "Frida JSON upload failed"); }

                if (fridaEngine.metadata.dynamicPdfPath) {
                    try {
                        dynamicPdfPath = await uploadToStorage(
                            fridaEngine.metadata.dynamicPdfPath,
                            `${scan.user_id}/reports/${scan.id}-dynamic.pdf`,
                            "application/pdf"
                        );
                        if (dynamicPdfPath) log("ok", "Dynamic PDF uploaded");
                    } catch { log("warn", "Dynamic PDF upload failed"); }
                }
            }

            // ── Determine dynamic status ─────────────────────────────────────
            let dynamicStatus = "completed";
            let dynamicReportJson = {};

            if (fridaEngine?.skipped) {
                dynamicStatus = "skipped";
                dynamicReportJson = { skipped: true, reason: fridaEngine.error };
                log("warn", `Frida: skipped — ${fridaEngine.error}`);
            } else if (fridaEngine && !fridaEngine.success) {
                dynamicStatus = "failed";
                dynamicReportJson = { error: fridaEngine.error };
                log("error", `Frida: failed — ${fridaEngine.error}`);
            } else if (fridaEngine?.success) {
                dynamicReportJson = {
                    ...fridaEngine.metadata.fridaResults,
                    pdfPath: dynamicPdfPath,
                };
                log("ok", "Frida: completed successfully");
            } else {
                dynamicStatus = "not_available";
                dynamicReportJson = { note: "Frida engine not installed" };
                log("warn", "Frida: not available");
            }

            // ── Update scan record ───────────────────────────────────────────
            log("info", "Updating scan record in Supabase...");
            await supabase.from("scans").update({
                status: "completed",
                completed_at: new Date().toISOString(),
                findings_critical: counts.critical,
                findings_high: counts.high,
                findings_medium: counts.medium,
                findings_low: counts.low,
                findings_info: counts.info,
                report_json: reportJson,
                report_url: pdfStoragePath,
                dynamic_status: dynamicStatus,
                dynamic_report_json: dynamicReportJson,
                dynamic_completed_at: new Date().toISOString(),
            }).eq("id", scan.id);

            // ── Final summary ────────────────────────────────────────────────
            console.log();
            log("ok", `╔══════════════════════════════════════════════════════════╗`);
            log("ok", `║  JOB COMPLETE: ${scan.file_name.padEnd(40)}║`);
            log("ok", `╠══════════════════════════════════════════════════════════╣`);
            log("ok", `║  Engines:  ${String(result.summary.enginesRun).padStart(2)} ran │ ${String(result.summary.enginesSkipped).padStart(2)} skipped │ ${String(result.summary.enginesFailed).padStart(2)} failed      ║`);
            log("ok", `║  Findings: ${String(counts.critical).padStart(2)}C ${String(counts.high).padStart(2)}H ${String(counts.medium).padStart(2)}M ${String(counts.low).padStart(2)}L ${String(counts.info).padStart(2)}I  (${result.summary.totalFindings} total)${" ".repeat(Math.max(0, 14 - String(result.summary.totalFindings).length))}║`);
            log("ok", `║  Duration: ${elapsed(jobStart).padEnd(45)}║`);
            log("ok", `║  Dynamic:  ${dynamicStatus.padEnd(45)}║`);
            log("ok", `╚══════════════════════════════════════════════════════════╝`);
            console.log();

        } finally {
            // Always clean up temp APK
            try { await unlink(tempApkPath); } catch { /* ignore */ }
        }

    } catch (err) {
        log("error", `Job failed: ${err.message}`);
        await supabase.from("scans").update({
            status: "failed",
            error_message: err.message,
            completed_at: new Date().toISOString(),
            dynamic_status: "failed",
        }).eq("id", scan.id);
    }
}

// ── Polling Loop ──────────────────────────────────────────────────────────────

let isPolling = false;
let pollCount = 0;
let consecutiveFailures = 0;

// Realtime reconnect throttle
let realtimeErrors = 0;
let lastRealtimeReconnect = 0;
const MAX_REALTIME_ERRORS = 10;          // after this, polling-only mode
const REALTIME_RECONNECT_COOLDOWN_MS = 60_000; // min 60s between reconnects

async function pollPendingScans() {
    if (isPolling) return;
    isPolling = true;
    pollCount++;

    try {
        const pollStart = Date.now();
        const { data: pendingScans, error } = await supabase
            .from("scans")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);

        const pollMs = Date.now() - pollStart;

        if (error) {
            log("error", `Poll #${pollCount}: Supabase query failed (${pollMs}ms) — ${error.message}`);
            consecutiveFailures++;
            // After 2 consecutive failures, try auto-fixing with WARP
            if (consecutiveFailures >= 2) {
                log("warn", `${consecutiveFailures} consecutive poll failures — attempting WARP auto-fix...`);
                consecutiveFailures = 0;
                await ensureConnectivity();
            }
            return;
        }

        consecutiveFailures = 0; // Reset on success

        if (pendingScans && pendingScans.length > 0) {
            log("info", `Poll #${pollCount}: 🔔 Found pending scan! (${pollMs}ms)`);
            log("info", `  File: ${pendingScans[0].file_name}`);
            log("info", `  ID:   ${pendingScans[0].id}`);
            await processScan(pendingScans[0]);
            isPolling = false;
            setImmediate(pollPendingScans);
            return;
        } else {
            // Heartbeat — only log every 4th poll to avoid spam, but always log the first one
            if (pollCount === 1 || pollCount % 4 === 0) {
                log("info", `Poll #${pollCount}: No pending scans (${pollMs}ms) — waiting...`);
            }
        }
    } catch (err) {
        log("error", `Poll #${pollCount}: Exception — ${err.message}`);
    } finally {
        isPolling = false;
    }
}

// ── Realtime Listener ─────────────────────────────────────────────────────────

async function startWorker() {
    console.log();
    console.log("  ╔═══════════════════════════════════════════════════╗");
    console.log("  ║   🥷 ShinobiDroid — Scan Worker                   ║");
    console.log("  ╠═══════════════════════════════════════════════════╣");
    console.log(`  ║   Supabase: ${SUPABASE_URL.replace("https://", "").substring(0, 36).padEnd(36)}║`);
    console.log(`  ║   Time:     ${new Date().toLocaleString().padEnd(36)}║`);
    console.log("  ╚═══════════════════════════════════════════════════╝");
    console.log();

    // ── Connectivity check (auto-connects WARP if needed) ───────────
    log("info", "Testing Supabase connectivity...");
    const connected = await ensureConnectivity();
    if (!connected) {
        log("warn", "Starting in degraded mode — will retry connectivity on each poll");
    }

    // ── Discover available engines ──────────────────────────────────
    log("info", "Discovering engines...");
    try {
        const { discoverEngines } = await import("./orchestrator.mjs");
        const engines = await discoverEngines();
        log("ok", `Found ${engines.length} engine(s): ${engines.map(e => e.name).join(", ")}`);
    } catch (err) {
        log("warn", `Engine discovery: ${err.message}`);
    }

    console.log();
    log("info", "Starting poll loop...");
    pollPendingScans();

    // Fallback poll every 30s
    setInterval(pollPendingScans, 30_000);
    log("ok", "Worker ready. Upload an APK from the dashboard to start analysis.");
    console.log();

    // Start realtime subscription (throttled reconnect on error)
    subscribeRealtime();
}

function subscribeRealtime() {
    supabase
        .channel("public:scans")
        .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "scans", filter: "status=eq.pending" },
            (payload) => {
                log("info", `🔔 Realtime: New scan detected — ${payload.new.file_name}`);
                pollPendingScans();
            }
        )
        .subscribe((status) => {
            if (status === "SUBSCRIBED") {
                log("ok", "✅ Realtime channel subscribed — listening for new uploads");
                realtimeErrors = 0;
            } else if (status === "CHANNEL_ERROR") {
                realtimeErrors++;
                const now = Date.now();
                const secsSinceLastReconnect = ((now - lastRealtimeReconnect) / 1000).toFixed(0);

                if (realtimeErrors > MAX_REALTIME_ERRORS) {
                    log("warn", `Realtime: too many errors (${realtimeErrors}) — polling only mode`);
                    return;
                }

                if (now - lastRealtimeReconnect < REALTIME_RECONNECT_COOLDOWN_MS) {
                    log("warn", `Realtime error — reconnect cooldown active (${secsSinceLastReconnect}s ago), skipping`);
                    return;
                }

                log("warn", `Realtime error #${realtimeErrors} — reconnecting in 5s...`);
                lastRealtimeReconnect = now;

                setTimeout(async () => {
                    const warpOk = await ensureConnectivity().catch(() => false);
                    if (!warpOk) {
                        log("warn", "Realtime: WARP/Supabase unreachable, skipping reconnect");
                        return;
                    }
                    log("info", "Realtime: reconnecting channel...");
                    subscribeRealtime();
                }, 5000);
            } else {
                log("info", `Realtime channel status: ${status}`);
            }
        });
}

export { startWorker, processScan };

// Only auto-start when run directly (not when imported by tests)
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) {
    startWorker();
}
