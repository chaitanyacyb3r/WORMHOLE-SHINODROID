import { readFile, stat, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { config } from "dotenv";
import { runAllEngines } from "./orchestrator.mjs";

// Load .env from web/ for CONVEX_URL, or root .env
config({ path: join(import.meta.dirname, "web", ".env.local") });
config(); // Also load root .env if any

// ── Convex Client Setup ──────────────────────────────────────────────────────
// We use dynamic import since convex is installed in the web/ directory
const { ConvexHttpClient } = await import("convex/browser");

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;

if (!CONVEX_URL) {
    console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL in .env");
    console.error("Please add NEXT_PUBLIC_CONVEX_URL to web/.env.local to run the worker.");
    process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// If we have a deploy key, set it for admin access to internal functions
// Otherwise the worker uses the HTTP actions approach
if (CONVEX_DEPLOY_KEY) {
    convex.setAdminAuth(CONVEX_DEPLOY_KEY);
}

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

// ── Security Constants ───────────────────────────────────────────────────────
const MAX_APK_SIZE = 100 * 1024 * 1024; // 100MB — must match client-side limit

/**
 * Sanitize error messages before storing in database.
 * Strictly prevents stack traces or paths from leaking to the client UI.
 */
function sanitizeErrorMessage(msg) {
    if (!msg) return "An internal error occurred";
    let text = String(msg);
    // If it's a known whitelist error, let it through
    if (text.includes("Download failed") || text.includes("File size exceeds")) {
        return text.slice(0, 150);
    }
    // Otherwise return a generic error and scrub details
    return "Analysis engine encountered a specialized error processing this APK format.";
}

/**
 * Test if Convex is reachable.
 */
async function ensureConnectivity() {
    try {
        const start = Date.now();
        // Import internal API reference
        const { internal } = await import("./web/convex/_generated/api.js");
        const pendingScans = await convex.query(internal.scans.listPending, {});
        const ms = Date.now() - start;
        log("ok", `Convex connected successfully (${ms}ms)`);
        return true;
    } catch (e) {
        log("warn", `Convex unreachable: ${e.message}`);
        return false;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function insertFindings(findingsToInsert, scanId) {
    if (findingsToInsert.length === 0) return;
    const { internal } = await import("./web/convex/_generated/api.js");

    // DOS PROTECTION: Cap the number of findings to prevent Convex DB exhaustion
    const MAX_FINDINGS = 2000;
    if (findingsToInsert.length > MAX_FINDINGS) {
        log("warn", `Scan ${scanId} generated ${findingsToInsert.length} findings. Truncating to ${MAX_FINDINGS}.`);
        findingsToInsert = findingsToInsert.slice(0, MAX_FINDINGS);
        findingsToInsert.push({
            title: "Maximum Findings Reached",
            severity: "info",
            severityOrder: 5,
            category: "System",
            description: `This scan generated more than ${MAX_FINDINGS} findings. To prevent performance degradation, further findings have been truncated.`
        });
    }

    // Convex mutations have a size limit, so we batch in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < findingsToInsert.length; i += chunkSize) {
        const chunk = findingsToInsert.slice(i, i + chunkSize);

        // Map findings to Convex schema format (camelCase)
        const convexFindings = chunk.map(f => ({
            scanId,
            title: f.title || "Untitled",
            severity: f.severity || "info",
            severityOrder: f.severity_order || 0,
            category: f.category || f.engine || "general",
            description: f.description || undefined,
            recommendation: f.recommendation || undefined,
            cvssScore: f.cvss_score || undefined,
            owaspCategory: f.owasp_category || undefined,
        }));

        try {
            await convex.mutation(internal.findings.batchInsert, { findings: convexFindings });
        } catch (err) {
            log("warn", `Failed to insert findings chunk: ${err.message}`);
        }
    }
    log("ok", `Inserted ${findingsToInsert.length} findings`);
}

async function uploadToStorage(localPath, contentType) {
    try {
        await stat(localPath);
        const buffer = await readFile(localPath);
        const { internal } = await import("./web/convex/_generated/api.js");

        // 1. Get upload URL from Convex
        const uploadUrl = await convex.mutation(internal.storage.generateUploadUrlInternal, {});

        // 2. Upload file to Convex storage
        const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": contentType },
            body: buffer,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const { storageId } = await response.json();
        log("ok", `Uploaded → ${storageId}`);
        return storageId;
    } catch (e) {
        log("warn", `File not found or upload failed (${localPath}): ${e.message}`);
        return null;
    }
}

// ── Main scan processor ───────────────────────────────────────────────────────

async function processScan(scan) {
    const jobStart = Date.now();
    const { internal } = await import("./web/convex/_generated/api.js");

    console.log();
    log("info", `╔══════════════════════════════════════════════════════════╗`);
    log("info", `║  NEW JOB: ${scan.fileName.padEnd(45)}║`);
    log("info", `║  Scan ID: ${scan._id.padEnd(45)}║`);
    log("info", `║  Size: ${formatBytes(scan.fileSize || 0).padEnd(48)}║`);
    log("info", `╚══════════════════════════════════════════════════════════╝`);

    try {
        // ── Step 0: Server-side file size validation ────────────────────
        if (scan.fileSize && scan.fileSize > MAX_APK_SIZE) {
            throw new Error(`APK exceeds maximum size of ${formatBytes(MAX_APK_SIZE)} (got ${formatBytes(scan.fileSize)})`);
        }

        // ── Step 1: Update status ────────────────────────────────────────
        log("step", "[1/6] Updating scan status → scanning...");
        await convex.mutation(internal.scans.updateStatus, {
            id: scan._id,
            status: "scanning",
        });
        log("ok", "Scan status updated");

        // ── Step 2: Download APK ─────────────────────────────────────────
        log("step", `[2/6] Downloading APK from Convex storage...`);
        const dlStart = Date.now();

        let fileBuffer;
        if (scan.storageId) {
            const downloadUrl = await convex.query(internal.scans.getFileUrl, { storageId: scan.storageId });
            if (!downloadUrl) throw new Error("Could not get download URL for APK");

            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

            fileBuffer = Buffer.from(await response.arrayBuffer());
        } else {
            throw new Error("No storageId found for this scan");
        }

        log("ok", `Downloaded ${formatBytes(fileBuffer.length)} in ${elapsed(dlStart)}`);

        // ── Step 3: Write APK to temp ────────────────────────────────────
        const tempApkPath = join(tmpdir(), `Shinodroid-${scan._id}.apk`);
        await writeFile(tempApkPath, fileBuffer);
        log("step", `[3/6] APK written to: ${tempApkPath}`);

        try {
            // ── Step 4: Run ALL engines ──────────────────────────────────
            log("step", "[4/6] Launching engine orchestrator...");

            const { mkdirSync } = await import("node:fs");
            const reportsDir = process.env.REPORTS_OUTPUT_DIR || "C:\\MobSF-Scans\\reports";
            const outDir = join(reportsDir, scan._id);
            try { mkdirSync(outDir, { recursive: true }); } catch { /* exists */ }
            log("info", `Reports directory: ${outDir}`);

            const engineContext = {
                scanId: scan._id,
                outDir,
                fileName: scan.fileName,
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

            // ── Step 5: Save findings ────────────────────────────────────
            log("step", `[5/6] Saving ${result.findings.length} findings to Convex...`);
            if (result.findings.length > 0) {
                await insertFindings(result.findings, scan._id);
            } else {
                log("warn", "No findings to insert");
            }

            // ── Build severity counts ────────────────────────────────────
            const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
            for (const f of result.findings) {
                if (counts[f.severity] !== undefined) counts[f.severity]++;
            }

            // ── Per-engine breakdown ─────────────────────────────────────
            const engineBreakdown = {};
            for (const f of result.findings) {
                engineBreakdown[f.engine] = (engineBreakdown[f.engine] || 0) + 1;
            }
            for (const [eng, count] of Object.entries(engineBreakdown)) {
                log("info", `  📊 ${eng}: ${count} findings`);
            }

            // ── Extract engine-specific data ─────────────────────────────
            const mobsfEngine = result.engines.find(e => e.engine === "mobsf");
            const fridaEngine = result.engines.find(e => e.engine === "frida");

            const reportJson = mobsfEngine?.success ? {
                security_score: mobsfEngine.metadata?.securityScore || 0,
                average_cvss: mobsfEngine.metadata?.averageCvss || 0,
                app_name: mobsfEngine.metadata?.appName || scan.fileName,
                package_name: mobsfEngine.metadata?.packageName || "Unknown",
                version_name: mobsfEngine.metadata?.versionName || "Unknown",
                mobsf_hash: mobsfEngine.metadata?.hash || null,
            } : {};

            if (mobsfEngine?.success) {
                log("ok", `MobSF: app=${reportJson.app_name}, pkg=${reportJson.package_name}, score=${reportJson.security_score}`);
            }

            // ── Upload reports to Convex Storage ─────────────────────────
            log("step", "[6/6] Uploading reports to Convex storage...");

            let reportStorageId = null;
            if (mobsfEngine?.metadata?.outDir) {
                try {
                    reportStorageId = await uploadToStorage(
                        join(mobsfEngine.metadata.outDir, "report.pdf"),
                        "application/pdf"
                    );
                    if (reportStorageId) log("ok", "Static PDF uploaded");
                } catch { log("warn", "Static PDF not found, skipping"); }
            }

            let dynamicReportStorageId = null;
            if (fridaEngine?.success && fridaEngine.metadata?.fridaResults) {
                if (fridaEngine.metadata.dynamicPdfPath) {
                    try {
                        dynamicReportStorageId = await uploadToStorage(
                            fridaEngine.metadata.dynamicPdfPath,
                            "application/pdf"
                        );
                        if (dynamicReportStorageId) log("ok", "Dynamic PDF uploaded");
                    } catch { log("warn", "Dynamic PDF upload failed"); }
                }
            }

            // ── Update scan record ───────────────────────────────────────
            log("info", "Updating scan record in Convex...");
            const updateArgs = {
                id: scan._id,
                status: "completed",
                completedAt: Date.now(),
                findingsCritical: counts.critical,
                findingsHigh: counts.high,
                findingsMedium: counts.medium,
                findingsLow: counts.low,
                findingsInfo: counts.info,
                reportJson,
            };

            if (reportStorageId) updateArgs.reportStorageId = reportStorageId;
            if (dynamicReportStorageId) updateArgs.dynamicReportStorageId = dynamicReportStorageId;

            await convex.mutation(internal.scans.updateStatus, updateArgs);

            // ── Final summary ────────────────────────────────────────────
            console.log();
            log("ok", `╔══════════════════════════════════════════════════════════╗`);
            log("ok", `║  JOB COMPLETE: ${scan.fileName.padEnd(40)}║`);
            log("ok", `╠══════════════════════════════════════════════════════════╣`);
            log("ok", `║  Engines:  ${String(result.summary.enginesRun).padStart(2)} ran │ ${String(result.summary.enginesSkipped).padStart(2)} skipped │ ${String(result.summary.enginesFailed).padStart(2)} failed      ║`);
            log("ok", `║  Findings: ${String(counts.critical).padStart(2)}C ${String(counts.high).padStart(2)}H ${String(counts.medium).padStart(2)}M ${String(counts.low).padStart(2)}L ${String(counts.info).padStart(2)}I  (${result.summary.totalFindings} total)${" ".repeat(Math.max(0, 14 - String(result.summary.totalFindings).length))}║`);
            log("ok", `║  Duration: ${elapsed(jobStart).padEnd(45)}║`);
            log("ok", `╚══════════════════════════════════════════════════════════╝`);
            console.log();

        } finally {
            // Always clean up temp APK
            try { await unlink(tempApkPath); } catch { /* ignore */ }
        }

    } catch (err) {
        log("error", `Job failed: ${err.message}`);
        const { internal } = await import("./web/convex/_generated/api.js");
        await convex.mutation(internal.scans.updateStatus, {
            id: scan._id,
            status: "failed",
            errorMessage: sanitizeErrorMessage(err.message),
            completedAt: Date.now(),
        });
    }
}

// ── Polling Loop ──────────────────────────────────────────────────────────────

let isPolling = false;
let pollCount = 0;
let consecutiveFailures = 0;

async function pollPendingScans() {
    if (isPolling) return;
    isPolling = true;
    pollCount++;

    try {
        const pollStart = Date.now();
        const { internal } = await import("./web/convex/_generated/api.js");
        const pendingScans = await convex.query(internal.scans.listPending, {});
        const pollMs = Date.now() - pollStart;

        consecutiveFailures = 0;

        if (pendingScans && pendingScans.length > 0) {
            log("info", `Poll #${pollCount}: 🔔 Found pending scan! (${pollMs}ms)`);
            log("info", `  File: ${pendingScans[0].fileName}`);
            log("info", `  ID:   ${pendingScans[0]._id}`);
            await processScan(pendingScans[0]);
            isPolling = false;
            setImmediate(pollPendingScans);
            return;
        } else {
            if (pollCount === 1 || pollCount % 4 === 0) {
                log("info", `Poll #${pollCount}: No pending scans (${pollMs}ms) — waiting...`);
            }
        }
    } catch (err) {
        log("error", `Poll #${pollCount}: Exception — ${err.message}`);
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
            log("warn", `${consecutiveFailures} consecutive poll failures — will retry...`);
            consecutiveFailures = 0;
        }
    } finally {
        isPolling = false;
    }
}

// ── Worker Startup ────────────────────────────────────────────────────────────

async function startWorker() {
    console.log();
    console.log("  ╔═══════════════════════════════════════════════════╗");
    console.log("  ║   🥷 Shinodroid — Scan Worker (Convex)          ║");
    console.log("  ╠═══════════════════════════════════════════════════╣");
    const maskedUrl = CONVEX_URL.replace(/https:\/\/([^.]+)/, "https://$1").replace(/([a-z0-9]{8})[a-z0-9]+/, "$1****");
    console.log(`  ║   Convex:  ${maskedUrl.substring(0, 36).padEnd(36)}║`);
    console.log(`  ║   Time:    ${new Date().toLocaleString().padEnd(36)}║`);
    console.log("  ╚═══════════════════════════════════════════════════╝");
    console.log();

    // ── Connectivity check ──────────────────────────────────────────
    log("info", "Testing Convex connectivity...");
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

    // Poll every 30s (Convex queries are fast, no realtime channel needed here
    // since the worker is a background process, not a browser client)
    setInterval(pollPendingScans, 30_000);
    log("ok", "Worker ready. Upload an APK from the dashboard to start analysis.");
    console.log();
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
