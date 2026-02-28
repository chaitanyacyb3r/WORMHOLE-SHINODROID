/**
 * ShinobiDroid 忍ドロイド — Dynamic Analysis PDF Report Generator
 *
 * Takes the Frida results JSON and produces a professionally styled PDF
 * with script outputs, findings summary, and OWASP-aligned recommendations.
 */

import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { join } from "node:path";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip emoji and non-ASCII symbols that PDFKit's built-in Helvetica can't render.
 * Replaces common symbols with ASCII equivalents and removes everything else
 * outside the basic Latin range (U+0000–U+024F).
 */
function stripEmoji(text) {
    if (!text) return text;
    return String(text)
        .replace(/\u26a0\ufe0f?/g, '[!]')   // ⚠️ → [!]
        .replace(/\u2705/g, '[OK]')          // ✅ → [OK]
        .replace(/\u274c/g, '[X]')           // ❌ → [X]
        .replace(/\u2714/g, '[OK]')          // ✔ → [OK]
        .replace(/\u2718/g, '[X]')           // ✘ → [X]
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // misc emoji
        .replace(/[\u{2600}-\u{27BF}]/gu, '')    // misc symbols
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // variation selectors
        .replace(/\u2192/g, '->')            // → → ->
        .replace(/\u2190/g, '<-')            // ← → <-
        .replace(/\u2022/g, '*')             // • → *
        .replace(/\u2013/g, '-')             // – → -
        .replace(/\u2014/g, '--')            // — → --
        .replace(/\u201c|\u201d/g, '"')      // "" → ""
        .replace(/\u2018|\u2019/g, "'")      // '' → ''
        .replace(/[^\x00-\u024F]/g, '');     // strip everything outside basic Latin
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
    darkCard: "#1a1a2e",
    border: "#2d2d44",
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
export async function generateDynamicPdf(fridaResults, dynamicFindings, scanMeta, outDir) {
    const pdfPath = join(outDir, "dynamic-report.pdf");

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 40, bottom: 40, left: 50, right: 50 },
            bufferPages: true,
        });

        const stream = createWriteStream(pdfPath);
        doc.pipe(stream);

        const pageWidth = doc.page.width - 100; // margins

        // ── Helper functions ──────────────────────────────────────────────

        function drawSectionHeader(title) {
            doc.moveDown(0.8);
            doc.fontSize(14).fillColor(COLORS.accent).text(title, { underline: false });
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y)
                .strokeColor(COLORS.accent).lineWidth(1).stroke();
            doc.moveDown(0.4);
        }

        function drawKeyValue(key, value, valueColor = COLORS.textPrimary) {
            doc.fontSize(9).fillColor(COLORS.textMuted).text(key + ": ", { continued: true });
            doc.fillColor(valueColor).text(String(value));
        }

        function drawBadge(text, color) {
            const x = doc.x;
            const y = doc.y;
            const textWidth = doc.widthOfString(text) + 12;
            doc.roundedRect(x, y - 2, textWidth, 16, 3).fill(color);
            doc.fontSize(8).fillColor(COLORS.white).text(text, x + 6, y, { width: textWidth });
            doc.x = x + textWidth + 8;
        }

        // ── Page 1: Cover ─────────────────────────────────────────────────

        doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);

        // Title block
        doc.moveDown(6);
        doc.fontSize(12).fillColor(COLORS.textMuted).text("S H I N O B I D R O I D", { align: "center", characterSpacing: 2 });
        doc.moveDown(0.2);
        doc.fontSize(24).fillColor(COLORS.accent).text("ShinobiDroid", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(16).fillColor(COLORS.textMuted).text("Dynamic Analysis Report", { align: "center" });

        // Horizontal rule
        doc.moveDown(1.5);
        doc.moveTo(150, doc.y).lineTo(doc.page.width - 150, doc.y)
            .strokeColor(COLORS.accent).lineWidth(2).stroke();
        doc.moveDown(1.5);

        // Meta info
        doc.fontSize(11).fillColor(COLORS.textPrimary)
            .text(`Application: ${scanMeta.packageName || "Unknown"}`, { align: "center" });
        doc.moveDown(0.3);
        doc.text(`File: ${scanMeta.fileName || "Unknown"}`, { align: "center" });
        doc.moveDown(0.3);
        doc.text(`Device: ${fridaResults.device || "Unknown"}`, { align: "center" });
        doc.moveDown(0.3);
        doc.text(`Date: ${new Date(fridaResults.timestamp).toLocaleString()}`, { align: "center" });
        doc.moveDown(0.3);
        doc.text(`Frida Version: 16.7.19`, { align: "center" });

        // Summary stats on cover — Row 1
        doc.moveDown(2);
        const summary = fridaResults.summary || {};
        const statsY = doc.y;

        const stats = [
            { label: "Scripts Run", value: `${summary.scriptsRun || 0}/${summary.totalScripts || 0}`, color: COLORS.accent },
            { label: "Successful", value: String(summary.successful || 0), color: COLORS.success },
            { label: "SSL Bypasses", value: String(summary.sslBypasses || 0), color: COLORS.warning },
            { label: "Root Bypasses", value: String(summary.rootBypasses || 0), color: COLORS.info },
            { label: "Findings", value: String(summary.findingsExtracted || dynamicFindings.length), color: COLORS.danger },
        ];

        const statBoxWidth = (pageWidth - 40) / stats.length;
        stats.forEach((stat, i) => {
            const x = 50 + (i * statBoxWidth) + (i * 10);
            doc.roundedRect(x, statsY, statBoxWidth - 10, 50, 4)
                .fillAndStroke(COLORS.darkCard, COLORS.border);
            doc.fontSize(18).fillColor(stat.color).text(stat.value, x, statsY + 8, { width: statBoxWidth - 10, align: "center" });
            doc.fontSize(7).fillColor(COLORS.textMuted).text(stat.label, x, statsY + 32, { width: statBoxWidth - 10, align: "center" });
        });

        // Summary stats — Row 2 (MASVS Categories)
        const row2Y = statsY + 62;
        const statsRow2 = [
            { label: "Crypto Ops", value: String(summary.cryptoOps || 0), color: "#c084fc" },
            { label: "Network", value: String(summary.networkCalls || 0), color: "#38bdf8" },
            { label: "Storage", value: String(summary.storageAccess || 0), color: "#fbbf24" },
            { label: "Auth", value: String(summary.authEvents || 0), color: "#a78bfa" },
            { label: "Platform", value: String(summary.platformIssues || 0), color: "#fb923c" },
            { label: "Resilience", value: String(summary.resilienceBypasses || 0), color: "#f87171" },
        ];

        const statBox2Width = (pageWidth - 50) / statsRow2.length;
        statsRow2.forEach((stat, i) => {
            const x = 50 + (i * statBox2Width) + (i * 10);
            doc.roundedRect(x, row2Y, statBox2Width - 10, 42, 4)
                .fillAndStroke(COLORS.darkCard, COLORS.border);
            doc.fontSize(14).fillColor(stat.color).text(stat.value, x, row2Y + 6, { width: statBox2Width - 10, align: "center" });
            doc.fontSize(6).fillColor(COLORS.textMuted).text(stat.label, x, row2Y + 26, { width: statBox2Width - 10, align: "center" });
        });

        // ── Page 2+: Script Results ───────────────────────────────────────

        if (fridaResults.scripts && fridaResults.scripts.length > 0) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);

            drawSectionHeader("Frida Script Results");

            for (const script of fridaResults.scripts) {
                // Script header card
                const scriptY = doc.y;
                doc.roundedRect(50, scriptY, pageWidth, 24, 3)
                    .fill(script.success ? "#0f2a1f" : "#2a0f0f");
                doc.fontSize(10).fillColor(script.success ? COLORS.success : COLORS.danger)
                    .text(`${script.success ? "[OK]" : "[FAIL]"} ${script.name}`, 58, scriptY + 6, { width: pageWidth - 80 });
                doc.fontSize(8).fillColor(COLORS.textMuted)
                    .text(`${script.outputLines} lines`, 50 + pageWidth - 80, scriptY + 7, { width: 70, align: "right" });

                doc.y = scriptY + 30;

                // Filter meaningful output lines (skip Frida banner)
                const meaningfulLines = (script.output || [])
                    .map(l => stripEmoji(l.replace(/\r/g, "").trim()))
                    .filter(l => l && !l.startsWith("____") && !l.startsWith("/ _") &&
                        !l.startsWith("| (_") && !l.startsWith("> _") &&
                        !l.startsWith("/_/") && !l.startsWith(". . .") &&
                        !l.startsWith("Commands:") && !l.startsWith("help") &&
                        !l.startsWith("object?") && !l.startsWith("exit/quit") &&
                        !l.startsWith("More info") && !l.includes("frida.re/docs"));

                if (meaningfulLines.length > 0) {
                    // Output box
                    doc.fontSize(7).fillColor(COLORS.textMuted).text("Output:", 50, doc.y);
                    doc.moveDown(0.2);

                    const outputText = meaningfulLines.slice(0, 40).join("\n");
                    // Calculate needed height
                    const outputHeight = Math.min(doc.heightOfString(outputText, { width: pageWidth - 20 }) + 16, 250);

                    // Check if we need a new page
                    if (doc.y + outputHeight > doc.page.height - 60) {
                        doc.addPage();
                        doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
                    }

                    const boxY = doc.y;
                    doc.roundedRect(50, boxY, pageWidth, outputHeight, 4)
                        .fill("#0d0d1a");
                    doc.font("Courier").fontSize(6.5).fillColor("#a3e635")
                        .text(outputText, 60, boxY + 8, { width: pageWidth - 20 });
                    doc.font("Helvetica");

                    if (meaningfulLines.length > 40) {
                        doc.fontSize(6).fillColor(COLORS.textMuted)
                            .text(`... and ${meaningfulLines.length - 40} more lines`, 60, boxY + outputHeight - 10);
                    }
                    doc.y = boxY + outputHeight + 8;
                }

                doc.moveDown(0.6);

                // Page break check
                if (doc.y > doc.page.height - 120) {
                    doc.addPage();
                    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
                }
            }
        }

        // ── Findings Section ──────────────────────────────────────────────

        if (dynamicFindings.length > 0) {
            if (doc.y > doc.page.height - 200) {
                doc.addPage();
                doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
            }

            drawSectionHeader(`Dynamic Findings (${dynamicFindings.length})`);

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
                    .text(`${severity.toUpperCase()} (${items.length})`, 50, doc.y);
                doc.moveDown(0.3);

                for (const finding of items) {
                    // Page break check
                    if (doc.y > doc.page.height - 100) {
                        doc.addPage();
                        doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
                    }

                    const cardY = doc.y;
                    doc.roundedRect(58, cardY, pageWidth - 8, 4, 0).fill(sevColor);

                    doc.fontSize(9).fillColor(COLORS.textPrimary)
                        .text(`● ${finding.title}`, 58, cardY + 8);

                    if (finding.category) {
                        doc.fontSize(7).fillColor(COLORS.textMuted)
                            .text(`Category: ${finding.category}`, 66, doc.y + 2);
                    }

                    if (finding.description) {
                        const descLines = finding.description.split("\n");
                        for (const line of descLines) {
                            doc.fontSize(7).fillColor(COLORS.textMuted).text(stripEmoji(line.trim()), 66, doc.y + 1);
                        }
                    }

                    if (finding.recommendation) {
                        doc.moveDown(0.2);
                        doc.fontSize(7).fillColor(COLORS.success)
                            .text(`-> ${stripEmoji(finding.recommendation)}`, 66, doc.y, { width: pageWidth - 30 });
                    }

                    if (finding.owasp_category) {
                        doc.fontSize(6.5).fillColor(COLORS.accent)
                            .text(`OWASP: ${finding.owasp_category}`, 66, doc.y + 2);
                    }

                    doc.moveDown(0.8);
                }
            }
        }

        // ── Footer on all pages ───────────────────────────────────────────

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(7).fillColor(COLORS.textMuted)
                .text(
                    `ShinobiDroid Dynamic Analysis Report — Page ${i + 1} of ${pages.count} — Generated ${new Date().toISOString()}`,
                    50, doc.page.height - 30,
                    { width: pageWidth, align: "center" }
                );
        }

        doc.end();
        stream.on("finish", () => resolve(pdfPath));
        stream.on("error", reject);
    });
}
