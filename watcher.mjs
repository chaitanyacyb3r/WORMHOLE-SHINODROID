/**
 * WORMHOLE // ShinobiDroid 忍ドロイド — Automated Android Pentesting Pipeline
 *
 * Pipeline per APK:
 *   Upload → MobSF Static Scan → JSON+PDF Reports
 *   → Install on Emulator → Frida Scripts → frida-results.json
 */

import { watch } from "chokidar";
import { readFile, writeFile, mkdir, stat, unlink } from "node:fs/promises";
import { basename, resolve, join, extname } from "node:path";
import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { runDynamicAnalysis, checkEmulator } from "./dynamic-analyzer.mjs";

// ── Load environment ────────────────────────────────────────────────────────

config(); // reads .env

const MOBSF_URL = (process.env.MOBSF_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const MOBSF_API_KEY = process.env.MOBSF_API_KEY;
const APK_INBOX_DIR = resolve(process.env.APK_INBOX_DIR || "C:\\MobSF-Scans\\inbox");
const REPORTS_DIR = resolve(process.env.REPORTS_OUTPUT_DIR || "C:\\MobSF-Scans\\reports");
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_CHAT_IDS = process.env.TELEGRAM_ALLOWED_CHATS
    ? process.env.TELEGRAM_ALLOWED_CHATS.split(",").map(id => id.trim())
    : []; // empty = allow all
const FETCH_TIMEOUT = 180_000; // 3 min
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Validate config ─────────────────────────────────────────────────────────

if (!MOBSF_API_KEY) {
    console.error("❌ MOBSF_API_KEY is not set in .env. Exiting.");
    process.exit(1);
}

// Ensure MOBSF_URL points to safe destinations only
// Allows: localhost, 127.0.0.1, ::1, Docker service names (single-word),
//         private IPs (10.x, 172.16-31.x, 192.168.x)
try {
    const u = new URL(MOBSF_URL);
    const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(host);
    const isDockerService = /^[a-z][a-z0-9_-]*$/.test(host) && !host.includes(".");
    const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host);
    if (!isLoopback && !isDockerService && !isPrivateIP) {
        console.error(`❌ Security: MOBSF_URL must point to localhost, Docker service, or private IP. Got: ${host}`);
        process.exit(1);
    }
} catch {
    console.error(`❌ Invalid MOBSF_URL: ${MOBSF_URL}`);
    process.exit(1);
}

// ── Allowed file types ──────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([
    ".apk", ".xapk", ".apks", ".aab",
    ".ipa",
    ".appx",
    ".zip",
]);

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function isValidMagicBytes(buf) {
    if (buf.length < 4) return false;
    return buf.subarray(0, 4).equals(ZIP_MAGIC);
}

// ── Safe fetch helper ───────────────────────────────────────────────────────

async function safeFetch(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function authHeaders() {
    return { Authorization: MOBSF_API_KEY };
}

// ── Logging ─────────────────────────────────────────────────────────────────

function log(level, msg) {
    const ts = new Date().toISOString();
    const prefix = { info: "ℹ️", ok: "✅", warn: "⚠️", error: "❌" }[level] || "•";
    console.log(`[${ts}] ${prefix} ${msg}`);
}

// ── Main scan pipeline ──────────────────────────────────────────────────────

/**
 * Process a file through the MobSF scan pipeline.
 * @param {Buffer} fileBuffer - File contents
 * @param {string} fileName - Original file name
 * @param {function|null} onProgress - Callback for progress updates (e.g. Telegram status)
 * @returns {object} - { success, outDir, reportData, error }
 */
export async function scanFile(fileBuffer, fileName, onProgress = null) {
    const ext = extname(fileName).toLowerCase();

    // Validate extension
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return { success: false, error: `Unsupported extension "${ext}"` };
    }

    // Validate magic bytes
    if (!isValidMagicBytes(fileBuffer)) {
        return { success: false, error: "Invalid file — not a valid APK/IPA/ZIP" };
    }

    const notify = onProgress || (() => { });

    try {
        // 1. Upload
        notify(`📤 Uploading ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);
        log("info", `Uploading ${fileName} to MobSF...`);

        const form = new FormData();
        form.append("file", new Blob([fileBuffer]), fileName);

        const uploadRes = await safeFetch(`${MOBSF_URL}/api/v1/upload`, {
            method: "POST",
            headers: authHeaders(),
            body: form,
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            return { success: false, error: `Upload failed (HTTP ${uploadRes.status}): ${err.slice(0, 200)}` };
        }

        const uploadData = await uploadRes.json();
        const hash = uploadData.hash;
        log("ok", `Uploaded — hash: ${hash}`);

        // 2. Scan
        notify(`🔍 Scanning ${fileName}... (30-120 seconds)`);
        log("info", `Scanning ${fileName}...`);

        const scanForm = new URLSearchParams();
        scanForm.append("hash", hash);

        const scanRes = await safeFetch(`${MOBSF_URL}/api/v1/scan`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
            body: scanForm.toString(),
        });

        if (!scanRes.ok) {
            const err = await scanRes.text();
            return { success: false, error: `Scan failed (HTTP ${scanRes.status}): ${err.slice(0, 200)}` };
        }
        log("ok", `Scan complete`);

        // 3. Create output directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const appName = fileName.replace(extname(fileName), "").replace(/[^a-zA-Z0-9_.-]/g, "_");
        const outDir = join(REPORTS_DIR, `${appName}-${timestamp}`);
        await mkdir(outDir, { recursive: true });

        // 4. JSON Report
        notify(`📋 Retrieving report...`);
        log("info", `Downloading JSON report...`);

        const reportForm = new URLSearchParams();
        reportForm.append("hash", hash);

        const reportRes = await safeFetch(`${MOBSF_URL}/api/v1/report_json`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
            body: reportForm.toString(),
        });

        let reportData = null;
        if (reportRes.ok) {
            const text = await reportRes.text();
            if (text.length <= MAX_BODY_BYTES) {
                reportData = JSON.parse(text);
                await writeFile(join(outDir, "report.json"), JSON.stringify(reportData, null, 2), "utf-8");
                log("ok", `JSON report saved`);
            }
        }

        // 5. PDF Report
        log("info", `Downloading PDF report...`);
        try {
            const pdfForm = new URLSearchParams();
            pdfForm.append("hash", hash);

            const pdfRes = await safeFetch(`${MOBSF_URL}/api/v1/download_pdf`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
                body: pdfForm.toString(),
            });

            if (pdfRes.ok) {
                const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
                if (pdfBuf.length > 0) {
                    await writeFile(join(outDir, "report.pdf"), pdfBuf);
                    log("ok", `PDF report saved`);
                }
            }
        } catch (e) {
            log("warn", `PDF download error: ${e.message}`);
        }

        // 6. Dynamic Analysis (Frida) — only for APK files
        let fridaResults = null;
        if (ext === ".apk") {
            notify(`🔬 Running dynamic analysis (Frida)...`);
            log("info", "Starting Frida dynamic analysis...");

            // Save APK to disk for adb install (use the buffer we already have)
            const tmpApkPath = join(outDir, fileName);
            await writeFile(tmpApkPath, fileBuffer);

            const dynResult = await runDynamicAnalysis(tmpApkPath, outDir, reportData, notify);

            if (dynResult.success) {
                fridaResults = dynResult.results;
                log("ok", `Dynamic analysis complete — ${fridaResults.summary.totalHooks} hooks found`);
            } else if (dynResult.skipped) {
                log("warn", `Dynamic analysis skipped: ${dynResult.error}`);
            } else {
                log("error", `Dynamic analysis failed: ${dynResult.error}`);
            }

            // Clean up temp APK copy
            try { await unlink(tmpApkPath); } catch { /* ignore */ }
        }

        log("ok", `Reports saved to: ${outDir}`);
        return { success: true, outDir, reportData, hash, fridaResults };

    } catch (err) {
        if (err.message?.includes("ECONNREFUSED")) {
            return { success: false, error: "Cannot connect to MobSF. Is it running?" };
        }
        return { success: false, error: err.message };
    }
}

// ── Format report for Telegram ──────────────────────────────────────────────

function formatTelegramReport(reportData, fileName, outDir) {
    const lines = [];
    lines.push(`📱 *MobSF Security Report*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📦 *File:* \`${escMd(fileName)}\``);

    if (reportData.app_name) lines.push(`📛 *App:* ${escMd(reportData.app_name)}`);
    if (reportData.package_name) lines.push(`📋 *Package:* \`${escMd(reportData.package_name)}\``);
    if (reportData.version_name) lines.push(`🏷️ *Version:* ${escMd(reportData.version_name)}`);

    if (reportData.security_score != null) {
        const score = reportData.security_score;
        const emoji = score >= 70 ? "🟢" : score >= 40 ? "🟡" : "🔴";
        lines.push(`\n${emoji} *Security Score: ${score}/100*`);
    }

    if (reportData.average_cvss != null) {
        lines.push(`📊 *Average CVSS:* ${reportData.average_cvss}`);
    }

    // Severity counts
    if (reportData.code_analysis) {
        const sev = { high: 0, warning: 0, info: 0, secure: 0 };
        for (const [, f] of Object.entries(reportData.code_analysis)) {
            const s = (f.severity ?? "").toLowerCase();
            if (s === "high" || s === "danger") sev.high++;
            else if (s === "warning" || s === "medium") sev.warning++;
            else if (s === "info" || s === "low") sev.info++;
            else if (s === "good" || s === "secure") sev.secure++;
        }
        lines.push(`\n🔴 ${sev.high} High  🟠 ${sev.warning} Warning  🟡 ${sev.info} Info  🟢 ${sev.secure} Secure`);
    }

    // Top 5 findings
    if (reportData.code_analysis) {
        const findings = Object.entries(reportData.code_analysis)
            .map(([id, f]) => ({ id, ...f }))
            .sort((a, b) => {
                const order = { high: 0, danger: 0, warning: 1, medium: 1, info: 2, low: 2 };
                return (order[(a.severity ?? "").toLowerCase()] ?? 3) - (order[(b.severity ?? "").toLowerCase()] ?? 3);
            })
            .slice(0, 5);

        if (findings.length > 0) {
            lines.push(`\n*Top Findings:*`);
            for (const f of findings) {
                const sevLabel = (f.severity ?? "info").toUpperCase();
                const title = f.title ?? f.description ?? f.id;
                lines.push(`  ⚠️ \\[${escMd(sevLabel)}\\] ${escMd(title)}`);
            }
        }
    }

    // Dangerous permissions
    if (reportData.permissions) {
        const dangerous = Object.entries(reportData.permissions)
            .filter(([, p]) => (p.status ?? p.severity ?? "").toLowerCase() === "dangerous");
        if (dangerous.length > 0) {
            lines.push(`\n🔓 *Dangerous Permissions (${dangerous.length}):*`);
            for (const [perm] of dangerous.slice(0, 5)) {
                lines.push(`  • \`${escMd(perm.split(".").pop())}\``);
            }
            if (dangerous.length > 5) lines.push(`  _…and ${dangerous.length - 5} more_`);
        }
    }

    lines.push(`\n📁 *Reports saved to:*`);
    lines.push(`\`${escMd(outDir)}\``);

    return lines.join("\n");
}

// Escape Markdown V2 special chars
function escMd(text) {
    if (!text) return "";
    return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ── Folder Watcher ──────────────────────────────────────────────────────────

async function setupFolderWatcher() {
    await mkdir(APK_INBOX_DIR, { recursive: true });
    const processing = new Set();

    const watcher = watch(APK_INBOX_DIR, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 },
        depth: 0,
    });

    watcher.on("add", async (filePath) => {
        const absPath = resolve(filePath);
        if (processing.has(absPath)) return;
        processing.add(absPath);

        try {
            const buf = await readFile(absPath);
            const name = basename(absPath);
            const result = await scanFile(buf, name);

            if (result.success) {
                log("ok", `Folder scan complete: ${name} → ${result.outDir}`);
            } else {
                log("error", `Folder scan failed: ${name} — ${result.error}`);
            }
        } catch (err) {
            log("error", `Error processing ${basename(absPath)}: ${err.message}`);
        } finally {
            processing.delete(absPath);
        }
    });

    watcher.on("error", (err) => log("error", `Watcher error: ${err.message}`));
    log("info", `📂 Watching folder: ${APK_INBOX_DIR}`);
    return watcher;
}

// ── Telegram Bot ────────────────────────────────────────────────────────────

async function setupTelegramBot() {
    if (!TELEGRAM_TOKEN) {
        log("warn", "TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
        return null;
    }

    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    const botInfo = await bot.getMe();
    log("ok", `🤖 Telegram bot connected: @${botInfo.username}`);

    // ── /start command ──
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, [
            `🛡️ *MobSF Security Scanner Bot*`,
            ``,
            `Send me an APK, IPA, or APPX file and I'll scan it for security vulnerabilities using MobSF\\.`,
            ``,
            `*Commands:*`,
            `/scan \\- Send an APK file to scan`,
            `/status \\- Check MobSF connection`,
            `/scans \\- List recent scans`,
            `/help \\- Show this message`,
            ``,
            `Your Chat ID: \`${chatId}\``,
        ].join("\n"), { parse_mode: "MarkdownV2" });
    });

    // ── /help command ──
    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id, [
            `📖 *How to use:*`,
            ``,
            `1\\. Send me an APK/IPA file as a document`,
            `2\\. I'll upload it to MobSF and start scanning`,
            `3\\. You'll get a security report with findings`,
            ``,
            `Supported formats: \\.apk, \\.xapk, \\.ipa, \\.appx, \\.aab, \\.zip`,
            `Max file size: 50 MB \\(Telegram limit\\)`,
        ].join("\n"), { parse_mode: "MarkdownV2" });
    });

    // ── /status command ──
    bot.onText(/\/status/, async (msg) => {
        try {
            const res = await safeFetch(`${MOBSF_URL}/api/v1/scans?page=1&page_size=1`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                bot.sendMessage(msg.chat.id, "✅ MobSF is running and API is connected!");
            } else {
                bot.sendMessage(msg.chat.id, `⚠️ MobSF API responded with HTTP ${res.status}`);
            }
        } catch {
            bot.sendMessage(msg.chat.id, "❌ Cannot connect to MobSF. Is it running?");
        }
    });

    // ── /scans command ──
    bot.onText(/\/scans/, async (msg) => {
        try {
            const res = await safeFetch(`${MOBSF_URL}/api/v1/scans?page=1&page_size=5`, {
                headers: authHeaders(),
            });
            if (!res.ok) {
                bot.sendMessage(msg.chat.id, "❌ Failed to fetch scans");
                return;
            }
            const data = await res.json();
            const scans = data.content ?? data.results ?? [];
            if (scans.length === 0) {
                bot.sendMessage(msg.chat.id, "📋 No scans found yet.");
                return;
            }
            const lines = ["📋 *Recent Scans:*\n"];
            for (const s of scans) {
                const name = s.FILE_NAME ?? s.file_name ?? "unknown";
                const hash = (s.MD5 ?? s.hash ?? "N/A").slice(0, 8);
                lines.push("• " + escMd(name) + " (" + hash + "...)");
            }
            bot.sendMessage(msg.chat.id, lines.join("\n"), { parse_mode: "MarkdownV2" });
        } catch {
            bot.sendMessage(msg.chat.id, "❌ Error fetching scans");
        }
    });

    // ── Handle document (APK/IPA) uploads ──
    bot.on("document", async (msg) => {
        const chatId = msg.chat.id;

        // Check allowlist
        if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
            bot.sendMessage(chatId, "🔒 You are not authorized to use this bot.");
            return;
        }

        const doc = msg.document;
        const fileName = doc.file_name || "unknown.apk";
        const ext = extname(fileName).toLowerCase();

        // Validate extension
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            bot.sendMessage(chatId,
                "❌ Unsupported file type \"" + ext + "\".\n\nSupported: " + [...ALLOWED_EXTENSIONS].join(", ")
            );
            return;
        }

        // File size check (Telegram limit is ~50MB, MobSF can handle more)
        const fileSizeMB = (doc.file_size / (1024 * 1024)).toFixed(1);
        log("info", `Telegram: ${msg.from?.username ?? "user"} sent ${fileName} (${fileSizeMB} MB)`);

        // Send initial status
        const statusMsg = await bot.sendMessage(chatId,
            "📥 Received: " + fileName + " (" + fileSizeMB + " MB)\n\n⏳ Downloading from Telegram..."
        );

        // Helper to update status message
        const updateStatus = async (text) => {
            try {
                await bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: statusMsg.message_id,
                });
            } catch { /* ignore edit errors */ }
        };

        try {
            // Download file from Telegram
            const fileLink = await bot.getFileLink(doc.file_id);
            const dlRes = await safeFetch(fileLink);
            if (!dlRes.ok) {
                await updateStatus("❌ Failed to download file from Telegram servers.");
                return;
            }
            const fileBuffer = Buffer.from(await dlRes.arrayBuffer());

            // Also save to inbox for record
            const inboxPath = join(APK_INBOX_DIR, `tg-${Date.now()}-${fileName}`);
            await writeFile(inboxPath, fileBuffer);

            // Run scan with progress updates
            const result = await scanFile(fileBuffer, fileName, async (progressText) => {
                await updateStatus(progressText);
            });

            if (!result.success) {
                await updateStatus("❌ Scan failed: " + result.error);
                return;
            }

            // Send report
            if (result.reportData) {
                const reportText = formatTelegramReport(result.reportData, fileName, result.outDir);
                try {
                    await bot.sendMessage(chatId, reportText, { parse_mode: "MarkdownV2" });
                } catch {
                    // Fallback to plain text if MarkdownV2 fails
                    await bot.sendMessage(chatId, "✅ Scan complete for " + fileName + "\nReports saved to: " + result.outDir);
                }
            } else {
                await bot.sendMessage(chatId, "✅ Scan complete! Reports saved to:\n" + result.outDir);
            }

            // Send PDF if available
            const pdfPath = join(result.outDir, "report.pdf");
            try {
                await stat(pdfPath);
                await bot.sendDocument(chatId, pdfPath, {
                    caption: "📄 Full PDF report for " + fileName,
                });
            } catch { /* PDF not available */ }

            // Delete the status message (we sent the full report instead)
            try {
                await bot.deleteMessage(chatId, statusMsg.message_id);
            } catch { /* ignore */ }

            log("ok", `Telegram scan complete: ${fileName} → ${result.outDir}`);

        } catch (err) {
            log("error", `Telegram scan error: ${err.message}`);
            await updateStatus("❌ Error: " + err.message);
        }
    });

    // Handle non-document messages (text without commands)
    bot.on("message", (msg) => {
        if (msg.document || msg.text?.startsWith("/")) return;
        if (msg.photo || msg.video || msg.audio) {
            bot.sendMessage(msg.chat.id,
                "📎 Please send the APK/IPA as a *document* (file), not as a photo/video.",
                { parse_mode: "Markdown" }
            );
            return;
        }
    });

    return bot;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    await mkdir(APK_INBOX_DIR, { recursive: true });
    await mkdir(REPORTS_DIR, { recursive: true });

    log("info", `╔══════════════════════════════════════════════════════╗`);
    log("info", `║  WORMHOLE // ShinobiDroid 忍ドロイド               ║`);
    log("info", `╠══════════════════════════════════════════════════════╣`);
    log("info", `║  MobSF URL:  ${MOBSF_URL.padEnd(40)}║`);
    log("info", `║  Inbox:      ${APK_INBOX_DIR.padEnd(40).slice(0, 40)}║`);
    log("info", `║  Reports:    ${REPORTS_DIR.padEnd(40).slice(0, 40)}║`);
    log("info", `║  Telegram:   ${TELEGRAM_TOKEN ? "Enabled ✅" : "Disabled ❌  (set TELEGRAM_BOT_TOKEN)"}${"".padEnd(TELEGRAM_TOKEN ? 29 : 0)}║`);
    log("info", `╚══════════════════════════════════════════════════════╝`);

    // Start folder watcher
    const watcher = await setupFolderWatcher();

    // Start Telegram bot
    const bot = await setupTelegramBot();

    log("info", `🟢 Ready! Waiting for APK files...`);

    // Graceful shutdown
    const shutdown = async (sig) => {
        log("info", `${sig} received, shutting down...`);
        await watcher.close();
        if (bot) bot.stopPolling();
        process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    if (process.platform === "win32") {
        process.on("SIGBREAK", () => shutdown("SIGBREAK"));
    }
}
// Only run main() when this file is executed directly, NOT when imported.
// This is the ESM equivalent of Python's `if __name__ == "__main__":`.
// Without this guard, importing `scanFile` in mobsf.engine.mjs
// would trigger MobSF connection + Telegram bot setup.
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);

if (isMainModule) {
    main().catch((err) => {
        log("error", `Fatal: ${err.message}`);
        process.exit(1);
    });
}
