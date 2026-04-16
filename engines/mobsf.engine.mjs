/**
 * Shinodroid — MobSF Static Analysis Engine
 *
 * Wraps the existing MobSF integration (via watcher.mjs scanFile)
 * in the standard engine interface.
 *
 * What it does:
 *   - Upload APK to MobSF → run static scan → get JSON report
 *   - Extract code_analysis findings → standardized findings
 *   - Provides: reportData, packageName, outDir, hash (via metadata)
 */

import { createFinding } from "./_engine-interface.mjs";
import { scanFile } from "../watcher.mjs";

export default {
    name: "MobSF Static Analysis",
    type: "static",
    version: "1.0.0",

    /**
     * Check if MobSF is available.
     * We rely on the MOBSF_API_KEY env var being set.
     */
    async isAvailable() {
        return !!(process.env.MOBSF_API_KEY);
    },

    /**
     * Run MobSF static analysis on an APK.
     *
     * @param {string} apkPath - Absolute path to APK
     * @param {import("./_engine-interface.mjs").EngineContext} context
     * @returns {Promise<import("./_engine-interface.mjs").EngineResult>}
     */
    async run(apkPath, context) {
        const start = Date.now();

        try {
            // Read the APK file into a buffer (scanFile expects a buffer)
            const { readFile } = await import("node:fs/promises");
            const fileBuffer = await readFile(apkPath);

            const result = await scanFile(fileBuffer, context.fileName, (msg) => {
                context.onProgress?.(`[MobSF] ${msg}`);
                context.log?.("info", `[MobSF] ${msg}`);
            });

            if (!result.success) {
                return {
                    engine: "mobsf",
                    success: false,
                    findings: [],
                    metadata: {},
                    error: result.error || "MobSF scan failed",
                    durationMs: Date.now() - start,
                };
            }

            const { reportData, outDir, hash } = result;

            // Extract findings from code_analysis
            const findings = [];
            if (reportData?.code_analysis) {
                for (const [findingId, f] of Object.entries(reportData.code_analysis)) {
                    findings.push(createFinding({
                        title: f.title || f.description?.substring(0, 100) || findingId,
                        severity: f.severity,
                        category: "Static Analysis",
                        description: f.description || "No description provided",
                        recommendation: "Review the affected code block and apply standard security best practices.",
                        cvss_score: f.cvss || null,
                        owasp_category: f.owasp_mobile || null,
                    }, "mobsf", context.scanId));
                }
            }

            return {
                engine: "mobsf",
                success: true,
                findings,
                metadata: {
                    reportData,
                    outDir,
                    hash,
                    packageName: reportData?.package_name || null,
                    securityScore: reportData?.security_score || 0,
                    averageCvss: reportData?.average_cvss || 0,
                    appName: reportData?.app_name || context.fileName,
                    versionName: reportData?.version_name || "Unknown",
                },
                durationMs: Date.now() - start,
            };

        } catch (err) {
            return {
                engine: "mobsf",
                success: false,
                findings: [],
                metadata: {},
                error: err.message,
                durationMs: Date.now() - start,
            };
        }
    },
};
