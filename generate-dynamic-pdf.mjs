/**
 * Shinodroid — Dynamic Analysis PDF Report Generator
 *
 * Takes the Frida results JSON and produces a professionally styled,
 * publication-ready PDF with full multi-page script execution logs,
 * structured security bypass telemetries, and OWASP-aligned findings.
 */

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { join } from "node:path";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip emoji and non-ASCII symbols that PDFKit's built-in fonts can't render.
 * Replaces common symbols with ASCII equivalents and preserves readable Latin text.
 */
function stripEmoji(text) {
    if (!text) return "";
    return String(text)
        .replace(/\u26a0\ufe0f?/g, "[!]")   // ⚠️ → [!]
        .replace(/\u2705/g, "[OK]")          // ✅ → [OK]
        .replace(/\u274c/g, "[X]")           // ❌ → [X]
        .replace(/\u2714/g, "[OK]")          // ✔ → [OK]
        .replace(/\u2718/g, "[X]")           // ✘ → [X]
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")  // misc emoji
        .replace(/[\u{2600}-\u{27BF}]/gu, "")    // misc symbols
        .replace(/[\u{FE00}-\u{FE0F}]/gu, "")    // variation selectors
        .replace(/\u2192/g, "->")            // → → ->
        .replace(/\u2190/g, "<-")            // ← → <-
        .replace(/\u2022/g, "*")             // • → *
        .replace(/\u2013/g, "-")             // – → -
        .replace(/\u2014/g, "--")            // — → --
        .replace(/\u201c|\u201d/g, '"')      // "" → ""
        .replace(/\u2018|\u2019/g, "'")      // '' → ''
        .replace(/[^\x00-\u024F]/g, "");     // strip everything outside basic Latin
}

/**
 * Intelligent parser that cleans raw Frida output, extracts meaningful security
 * events, removes internal bridge noise / stack traces, and highlights bypasses.
 *
 * @param {string[]} rawLines
 * @returns {{ lines: string[], highlights: string[] }}
 */
export function parseFridaOutput(rawLines) {
    if (!rawLines || !Array.isArray(rawLines)) return { lines: [], highlights: [] };

    const joined = rawLines.map(l => String(l).replace(/\r/g, "")).join("\n");
    // Normalize split stdout buffers (e.g. 'message:\n {' or 'data:\n None')
    const normalized = joined
        .replace(/message:\s*\n\s*\{/g, "message: {")
        .replace(/data:\s*\n\s*None/g, "data: None")
        .replace(/\}\s*\ndata:\s*None/g, "} data: None");

    const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
    const cleaned = [];
    const bypassHighlights = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 1. Filter Frida banner, interactive REPL prompts, and tool headers
        if (
            line.startsWith("____") || line.startsWith("/ _") || line.startsWith("| (_") ||
            line.startsWith("> _") || line.startsWith("/_/") || line.startsWith(". . .") ||
            line.startsWith("Commands:") || line.startsWith("help") || line.startsWith("object?") ||
            line.startsWith("exit/quit") || line.startsWith("More info") || line.includes("frida.re/docs") ||
            line.includes("Prefer a GUI?") || line.includes("luma.frida.re") ||
            line.includes("Connected to Android Emulator") ||
            line.startsWith("Spawning `") || line.startsWith("Spawned `") ||
            line.startsWith("[Android Emulator") || line === "%resume" ||
            line === "data: None" || line === "None"
        ) {
            continue;
        }

        // 2. Collapse repetitive border lines
        if (/^([=\-_*#~])\1{5,}$/.test(line)) {
            continue;
        }

        // 3. Strip internal Frida java bridge stack frames
        if (
            line.includes("/frida/bridges/java.js") ||
            line.includes("at apply (native)") ||
            line.includes("at _performPendingVmOps") ||
            (line.startsWith("at <anonymous>") && (line.includes("PintooR.js") || line.includes("frida")))
        ) {
            continue;
        }

        // 4. Parse structured 'message: {type: send, payload: ...}' payloads
        const sendMatch = line.match(/message:\s*\{['"]type['"]:\s*['"]send['"],\s*['"]payload['"]:\s*(['"]?)(.*?)\1\s*\}\s*(?:data:\s*None)?$/);
        if (sendMatch) {
            let payload = sendMatch[2].trim().replace(/\\'/g, "'").replace(/\\"/g, '"');

            if (payload.toLowerCase().includes("bypass root check for package:")) {
                const pkg = payload.split("package:")[1]?.trim() || "";
                cleaned.push(`[ROOT BYPASS] Neutralized root check for: ${pkg}`);
                if (!bypassHighlights.includes(`Root check: ${pkg}`)) bypassHighlights.push(`Root check: ${pkg}`);
            } else if (payload.toLowerCase().includes("bypass return value for binary:")) {
                const bin = payload.split("binary:")[1]?.trim() || "";
                cleaned.push(`[ROOT BYPASS] Neutralized binary detection for: ${bin}`);
                if (!bypassHighlights.includes(`Binary: ${bin}`)) bypassHighlights.push(`Binary: ${bin}`);
            } else if (payload.toLowerCase().includes("ssl") || payload.toLowerCase().includes("pinning") || payload.toLowerCase().includes("cert")) {
                cleaned.push(`[SSL BYPASS] ${payload}`);
                if (!bypassHighlights.includes(payload)) bypassHighlights.push(payload);
            } else if (payload.toLowerCase().includes("loaded") && payload.toLowerCase().includes("classes")) {
                cleaned.push(`[INIT] Runtime initialized — ${payload}`);
            } else if (payload.toLowerCase().includes("hook not loaded")) {
                cleaned.push(`[INFO] Hook skipped (not present in target): ${payload.replace(" hook not loaded", "")}`);
            } else {
                cleaned.push(`[HOOK] ${payload}`);
            }
            continue;
        }

        // 5. Clean up TypeError stack headers
        if (line.startsWith("TypeError: not a function")) {
            cleaned.push("[WARN] Optional API hook skipped (signature mismatch on target Android OS)");
            continue;
        }

        cleaned.push(stripEmoji(line));
    }

    return { lines: cleaned, highlights: bypassHighlights };
}

/**
 * Returns color code for specific line prefixes to provide rich syntax highlighting.
 */
function getLineColor(text) {
    if (text.startsWith("[ROOT BYPASS]") || text.startsWith("[SSL BYPASS]")) return "#fbbf24"; // Amber/Gold
    if (text.startsWith("[+]") || text.startsWith("[OK]")) return "#34d399";                    // Emerald Green
    if (text.startsWith("[!]") || text.startsWith("[WARN]")) return "#facc15";                  // Yellow
    if (text.startsWith("[-]") || text.startsWith("[FAIL]")) return "#f87171";                  // Coral Red
    if (text.startsWith("[INIT]") || text.startsWith("[INFO]")) return "#38bdf8";              // Sky Blue
    if (text.includes("[CRYPTO]")) return "#c084fc";                                            // Purple
    return "#cbd5e1";                                                                           // Slate
}

// ── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
    bg: "#0a0a14",
    headerBg: "#12121f",
    accent: "#a78bfa",    // Purple
    accentDim: "#7c3aed",
    success: "#34d399",
    danger: "#f87171",
    warning: "#f59e0b",
    info: "#60a5fa",
    textPrimary: "#e2e8f0",
    textMuted: "#94a3b8",
    white: "#ffffff",
    black: "#000000",
    darkCard: "#141426",
    terminalBg: "#0c0c17",
    border: "#252538",
    gutter: "#475569",
};

const SEV_COLORS = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#3b82f6",
    info: "#10b981",
};

// ── PDF Generator ────────────────────────────────────────────────────────────

/**
 * Generate a dynamic analysis PDF report.
 *
 * @param {object} fridaResults – The full Frida results JSON object
 * @param {object[]} dynamicFindings – Structured findings array from the parser
 * @param {object} scanMeta – { fileName, packageName, scanId }
 * @param {string} outDir – Directory to write the PDF to
 * @returns {Promise<string>} – Absolute path to the generated PDF
 */
export async function generateDynamicPdf(fridaResults, dynamicFindings = [], scanMeta = {}, outDir) {
    const pdfPath = join(outDir, "dynamic-report.pdf");

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 40, bottom: 40, left: 45, right: 45 },
            bufferPages: true,
        });

        const stream = createWriteStream(pdfPath);
        doc.pipe(stream);

        const pageWidth = doc.page.width - 90; // margins: 45 left, 45 right

        function drawPageBg() {
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
        }

        function drawSectionHeader(title, subtitle = "") {
            doc.moveDown(0.6);
            doc.fontSize(14).fillColor(COLORS.accent).text(title, 45, doc.y);
            if (subtitle) {
                doc.moveDown(0.2);
                doc.fontSize(8).fillColor(COLORS.textMuted).text(subtitle, 45, doc.y);
            }
            doc.moveDown(0.4);
            doc.moveTo(45, doc.y).lineTo(45 + pageWidth, doc.y)
                .strokeColor(COLORS.border).lineWidth(1).stroke();
            doc.moveDown(0.6);
        }

        // ── Page 1: Cover & Executive Dashboard ───────────────────────────

        drawPageBg();

        // Header brand
        doc.moveDown(5);
        doc.fontSize(12).fillColor(COLORS.textMuted).text("S H I N O D R O I D", { align: "center", characterSpacing: 2 });
        doc.moveDown(0.2);
        doc.fontSize(24).fillColor(COLORS.accent).text("WORMHOLE // Shinodroid", { align: "center" });
        doc.moveDown(0.4);
        doc.fontSize(15).fillColor(COLORS.textPrimary).text("Dynamic Security Analysis Report", { align: "center" });

        // Accent divider
        doc.moveDown(1.5);
        doc.moveTo(120, doc.y).lineTo(doc.page.width - 120, doc.y)
            .strokeColor(COLORS.accentDim).lineWidth(1.5).stroke();
        doc.moveDown(1.5);

        // Metadata grid
        doc.fontSize(10).fillColor(COLORS.textPrimary)
            .text(`Application: ${scanMeta.packageName || "Unknown"}`, { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor(COLORS.textMuted)
            .text(`Target File: ${scanMeta.fileName || "Unknown"}  |  Scan ID: ${scanMeta.scanId || "Local"}`, { align: "center" });
        doc.moveDown(0.3);
        doc.text(`Device: ${fridaResults.device || "Android Emulator"}  |  Date: ${new Date(fridaResults.timestamp || Date.now()).toLocaleString()}`, { align: "center" });

        // Summary Stats Row 1
        doc.moveDown(2.5);
        const summary = fridaResults.summary || {};
        const statsRow1 = [
            { label: "Scripts Run", value: `${summary.scriptsRun || 0}/${summary.totalScripts || 0}`, color: COLORS.accent },
            { label: "Successful", value: String(summary.successful || 0), color: COLORS.success },
            { label: "SSL Confirmed", value: String(summary.sslBypassesConfirmed || summary.sslBypasses || 0), color: COLORS.danger },
            { label: "SSL Unverified", value: String(summary.sslHooksUnconfirmed || 0), color: COLORS.warning },
            { label: "Root Bypasses", value: String(summary.rootBypasses || 0), color: COLORS.info },
            { label: "Findings", value: String(summary.findingsExtracted || dynamicFindings.length), color: COLORS.danger },
        ];

        const row1W = pageWidth / statsRow1.length;
        const row1Y = doc.y;
        statsRow1.forEach((stat, i) => {
            const x = 45 + (i * row1W);
            doc.roundedRect(x + 3, row1Y, row1W - 6, 48, 4).fillAndStroke(COLORS.darkCard, COLORS.border);
            doc.fontSize(16).fillColor(stat.color).text(stat.value, x + 3, row1Y + 7, { width: row1W - 6, align: "center" });
            doc.fontSize(6.5).fillColor(COLORS.textMuted).text(stat.label, x + 3, row1Y + 29, { width: row1W - 6, align: "center" });
        });

        // Summary Stats Row 2 (MASVS Category Breakdown)
        const row2Y = row1Y + 58;
        const statsRow2 = [
            { label: "Crypto Ops", value: String(summary.cryptoOps || 0), color: "#c084fc" },
            { label: "Network Calls", value: String(summary.networkCalls || 0), color: "#38bdf8" },
            { label: "Storage Access", value: String(summary.storageAccess || 0), color: "#fbbf24" },
            { label: "Auth Events", value: String(summary.authEvents || 0), color: "#a78bfa" },
            { label: "Platform Issues", value: String(summary.platformIssues || 0), color: "#fb923c" },
            { label: "Resilience Events", value: String(summary.resilienceBypasses || 0), color: "#f87171" },
        ];

        const row2W = pageWidth / statsRow2.length;
        statsRow2.forEach((stat, i) => {
            const x = 45 + (i * row2W);
            doc.roundedRect(x + 3, row2Y, row2W - 6, 44, 4).fillAndStroke(COLORS.darkCard, COLORS.border);
            doc.fontSize(13).fillColor(stat.color).text(stat.value, x + 3, row2Y + 6, { width: row2W - 6, align: "center" });
            doc.fontSize(6).fillColor(COLORS.textMuted).text(stat.label, x + 3, row2Y + 26, { width: row2W - 6, align: "center" });
        });

        // ── Page 2+: Script Execution Results (UNFILTERED & MULTI-PAGE PAGINATED) ──

        if (fridaResults.scripts && fridaResults.scripts.length > 0) {
            doc.addPage();
            drawPageBg();

            drawSectionHeader(
                "Runtime Instrumentation & Script Execution Logs",
                "Complete, structured execution telemetries captured during dynamic Frida hooking."
            );

            for (const script of fridaResults.scripts) {
                const { lines: parsedLines, highlights } = parseFridaOutput(script.output);

                // Check space for script card header
                if (doc.y > doc.page.height - 130) {
                    doc.addPage();
                    drawPageBg();
                    doc.y = 45;
                }

                const cardY = doc.y;
                const statusColor = script.success ? COLORS.success : COLORS.danger;
                const badgeBg = script.success ? "#064e3b" : "#7f1d1d";

                // Header Badge & Card
                doc.roundedRect(45, cardY, pageWidth, 26, 4).fillAndStroke(COLORS.darkCard, COLORS.border);
                doc.roundedRect(52, cardY + 5, 52, 16, 3).fill(badgeBg);
                doc.fontSize(7.5).fillColor(statusColor)
                    .text(script.success ? "PASSED" : "FAILED", 52, cardY + 9, { width: 52, align: "center" });

                doc.fontSize(9.5).fillColor(COLORS.white)
                    .text(script.name, 114, cardY + 8);
                doc.fontSize(7.5).fillColor(COLORS.textMuted)
                    .text(`${parsedLines.length} events logged`, 45 + pageWidth - 110, cardY + 9, { width: 100, align: "right" });

                doc.y = cardY + 32;

                // Security Highlights Pill Bar (if bypasses/findings captured)
                if (highlights.length > 0) {
                    const hBoxY = doc.y;
                    doc.roundedRect(45, hBoxY, pageWidth, 18, 3).fill("#1e1b4b");
                    doc.fontSize(7.5).fillColor("#c7d2fe")
                        .text(`Intercepted: ${highlights.slice(0, 5).join("  •  ")}`, 52, hBoxY + 5, { width: pageWidth - 14, lineBreak: false });
                    doc.y = hBoxY + 22;
                }

                if (parsedLines.length === 0) {
                    doc.fontSize(7.5).fillColor(COLORS.textMuted)
                        .text("   No dynamic events recorded during monitoring window.", 50, doc.y);
                    doc.moveDown(0.6);
                    continue;
                }

                // ── Render Full Log Across Pages (NO TRUNCATION, NO "... and X more lines") ──
                const lineHeight = 10;
                let lineIdx = 0;

                while (lineIdx < parsedLines.length) {
                    // Check if current page is full
                    const remainingHeight = (doc.page.height - 45) - doc.y;
                    if (remainingHeight < 40) {
                        doc.addPage();
                        drawPageBg();
                        doc.fontSize(7.5).fillColor(COLORS.textMuted)
                            .text(`[Continued] ${script.name} — Execution Log`, 45, 45);
                        doc.y = 58;
                    }

                    const currentBoxY = doc.y;
                    const availableLines = Math.floor(((doc.page.height - 45) - currentBoxY - 8) / lineHeight);
                    const linesToPrint = Math.min(availableLines, parsedLines.length - lineIdx);

                    if (linesToPrint <= 0) {
                        doc.addPage();
                        drawPageBg();
                        doc.y = 45;
                        continue;
                    }

                    const currentChunk = parsedLines.slice(lineIdx, lineIdx + linesToPrint);
                    const boxHeight = (linesToPrint * lineHeight) + 8;

                    // Dark Terminal Container
                    doc.roundedRect(45, currentBoxY, pageWidth, boxHeight, 3).fill(COLORS.terminalBg);

                    // Render lines inside terminal box
                    for (let j = 0; j < currentChunk.length; j++) {
                        const actualLineNum = lineIdx + j + 1;
                        const lineText = currentChunk[j];
                        const textY = currentBoxY + 4 + (j * lineHeight);

                        // Line number column
                        doc.font("Courier").fontSize(6).fillColor(COLORS.gutter)
                            .text(String(actualLineNum).padStart(3, "0") + " │", 50, textY);

                        // Syntax colored payload
                        const textColor = getLineColor(lineText);
                        doc.font("Courier").fontSize(6.5).fillColor(textColor)
                            .text(lineText, 74, textY, { width: pageWidth - 34, lineBreak: false });
                    }

                    lineIdx += linesToPrint;
                    doc.y = currentBoxY + boxHeight + 8;
                }

                doc.moveDown(0.4);
            }
        }

        // ── Findings Section ──────────────────────────────────────────────

        if (dynamicFindings.length > 0) {
            if (doc.y > doc.page.height - 200) {
                doc.addPage();
                drawPageBg();
            }

            drawSectionHeader(
                `Dynamic Security Findings (${dynamicFindings.length})`,
                "Vulnerabilities and security weaknesses confirmed via live instrumentation."
            );

            // Group by severity
            const grouped = {};
            for (const f of dynamicFindings) {
                const sev = f.severity || "info";
                if (!grouped[sev]) grouped[sev] = [];
                grouped[sev].push(f);
            }

            for (const severity of ["critical", "high", "medium", "low", "info"]) {
                const items = grouped[severity];
                if (!items || items.length === 0) continue;

                const sevColor = SEV_COLORS[severity] || SEV_COLORS.info;

                doc.fontSize(10).fillColor(sevColor)
                    .text(`${severity.toUpperCase()} (${items.length})`, 45, doc.y);
                doc.moveDown(0.3);

                for (const finding of items) {
                    // Page break check
                    if (doc.y > doc.page.height - 110) {
                        doc.addPage();
                        drawPageBg();
                        doc.y = 45;
                    }

                    const cardY = doc.y;
                    doc.roundedRect(45, cardY, pageWidth, 4, 0).fill(sevColor);

                    doc.fontSize(9).fillColor(COLORS.textPrimary)
                        .text(`● ${finding.title}`, 50, cardY + 8);

                    if (finding.category) {
                        doc.fontSize(7).fillColor(COLORS.textMuted)
                            .text(`Category: ${finding.category}`, 58, doc.y + 2);
                    }

                    if (finding.description) {
                        const descLines = finding.description.split("\n");
                        for (const line of descLines) {
                            doc.fontSize(7).fillColor(COLORS.textMuted)
                                .text(stripEmoji(line.trim()), 58, doc.y + 1);
                        }
                    }

                    if (finding.recommendation) {
                        doc.moveDown(0.2);
                        doc.fontSize(7).fillColor(COLORS.success)
                            .text(`-> ${stripEmoji(finding.recommendation)}`, 58, doc.y, { width: pageWidth - 30 });
                    }

                    if (finding.owasp_category) {
                        doc.fontSize(6.5).fillColor(COLORS.accent)
                            .text(`OWASP MASVS: ${finding.owasp_category}`, 58, doc.y + 2);
                    }

                    doc.moveDown(0.6);
                }
            }
        }

        // ── Professional Footer on Every Page ─────────────────────────────

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.font("Helvetica").fontSize(7).fillColor(COLORS.textMuted)
                .text(
                    `WORMHOLE // Shinodroid Dynamic Security Report — Page ${i + 1} of ${pages.count} — Confirmed Dynamic Instrumentation`,
                    45, doc.page.height - 25,
                    { width: doc.page.width - 90, align: "center" }
                );
        }

        doc.end();
        stream.on("finish", () => resolve(pdfPath));
        stream.on("error", reject);
    });
}
