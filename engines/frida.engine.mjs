/**
 * Shinodroid — Frida Dynamic Analysis Engine
 *
 * Wraps the existing dynamic-analyzer.mjs in the standard engine interface.
 * Runs 9 MASVS-aligned Frida scripts + monkey exerciser + hook detection.
 *
 * This engine requires a connected Android emulator.
 * If no emulator is found, it returns { skipped: true } instead of failing.
 */

import { runDynamicAnalysis } from "../dynamic-analyzer.mjs";
import { generateDynamicPdf } from "../generate-dynamic-pdf.mjs";
import { join } from "node:path";

export default {
    name: "Frida Dynamic Analysis",
    type: "dynamic",
    version: "1.0.0",

    /**
     * Check if an emulator is connected via ADB.
     * We don't fail the pipeline if no emulator — just skip.
     */
    async isAvailable() {
        try {
            const { execFile } = await import("node:child_process");
            const { promisify } = await import("node:util");
            const execFileAsync = promisify(execFile);

            const { stdout } = await execFileAsync("adb", ["devices"], { timeout: 5000 });
            const lines = stdout.split("\n").filter(l => l.includes("device") && !l.startsWith("List"));
            if (lines.length > 0) {
                // Auto-set ANDROID_SERIAL to first device for subsequent -s calls
                const serial = lines[0].trim().split(/\s+/)[0];
                if (serial && !process.env.ANDROID_SERIAL) {
                    process.env.ANDROID_SERIAL = serial;
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Run Frida dynamic analysis on an APK.
     *
     * @param {string} apkPath - Absolute path to APK on disk
     * @param {import("./_engine-interface.mjs").EngineContext} context
     * @returns {Promise<import("./_engine-interface.mjs").EngineResult>}
     */
    async run(apkPath, context) {
        const start = Date.now();

        try {
            const dynamicResult = await runDynamicAnalysis(
                apkPath,
                context.outDir,
                context.mobsfReport || null,
                (msg) => {
                    context.onProgress?.(`[Frida] ${msg}`);
                    context.log?.("info", `[Frida] ${msg}`);
                },
                context.scanId
            );

            if (dynamicResult.skipped) {
                return {
                    engine: "frida",
                    success: false,
                    skipped: true,
                    findings: [],
                    metadata: { reason: dynamicResult.error },
                    error: dynamicResult.error || "No emulator connected",
                    durationMs: Date.now() - start,
                };
            }

            if (!dynamicResult.success) {
                return {
                    engine: "frida",
                    success: false,
                    findings: dynamicResult.findings || [],
                    metadata: {},
                    error: dynamicResult.error || "Dynamic analysis failed",
                    durationMs: Date.now() - start,
                };
            }

            const { results: fridaResults, findings: dynamicFindings = [] } = dynamicResult;

            // Generate Dynamic PDF
            let dynamicPdfPath = null;
            try {
                context.log?.("info", "Generating Dynamic Analysis PDF...");
                const pdfFile = await generateDynamicPdf(
                    fridaResults,
                    dynamicFindings,
                    {
                        fileName: context.fileName,
                        packageName: fridaResults.packageName,
                        scanId: context.scanId,
                    },
                    context.outDir
                );
                dynamicPdfPath = pdfFile;
                context.log?.("ok", `Dynamic PDF generated: ${pdfFile}`);
            } catch (pdfErr) {
                context.log?.("warn", `Dynamic PDF generation failed: ${pdfErr.message}`);
            }

            return {
                engine: "frida",
                success: true,
                findings: dynamicFindings,
                metadata: {
                    fridaResults,
                    packageName: fridaResults.packageName,
                    dynamicPdfPath,
                    summary: fridaResults.summary,
                },
                durationMs: Date.now() - start,
            };

        } catch (err) {
            return {
                engine: "frida",
                success: false,
                findings: [],
                metadata: {},
                error: err.message,
                durationMs: Date.now() - start,
            };
        }
    },
};
