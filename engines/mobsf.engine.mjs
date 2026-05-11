/**
 * Shinodroid — MobSF Static Analysis Engine
 */

import { createFinding } from "./_engine-interface.mjs";
import { MobSfService } from "../src/services/mobsf.service.mjs";
import { Config } from "../src/config/config.mjs";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export default {
    name: "MobSF Static Analysis",
    type: "static",
    version: "1.0.0",

    async isAvailable() {
        return await MobSfService.isAlive();
    },

    async run(apkPath, context) {
        const start = Date.now();
        const log = context.log || console.log;
        const notify = context.onProgress || (() => {});

        try {
            const { readFile } = await import("node:fs/promises");
            const fileBuffer = await readFile(apkPath);

            notify("📤 Uploading to MobSF...");
            const uploadReq = await MobSfService.upload(fileBuffer, context.fileName);
            const hash = uploadReq.hash;
            log("info", `Uploaded to MobSF. Hash: ${hash}`);

            notify("🔍 Running static scan...");
            await MobSfService.scan(hash);

            notify("📋 Downloading JSON report...");
            const reportData = await MobSfService.getJsonReport(hash);

            // Determine output directory
            const outDir = context.outDir || join(Config.REPORTS_DIR, context.scanId || hash);
            await mkdir(outDir, { recursive: true });

            // Save raw JSON
            await writeFile(join(outDir, "report.json"), JSON.stringify(reportData, null, 2), "utf-8");

            // Save PDF
            try {
                notify("📄 Downloading PDF report...");
                const pdfBuffer = await MobSfService.downloadPdf(hash);
                await writeFile(join(outDir, "report.pdf"), pdfBuffer);
            } catch (err) {
                log("warn", `PDF download failed: ${err.message}`);
            }

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
