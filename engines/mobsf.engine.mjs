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

            // Extract findings from MobSF JSON report
            const findings = [];

            // 1. Manifest Analysis findings
            if (Array.isArray(reportData?.manifest_analysis?.manifest_findings)) {
                for (const f of reportData.manifest_analysis.manifest_findings) {
                    findings.push(createFinding({
                        title: f.title || f.name || f.rule || "Manifest Security Finding",
                        severity: f.severity,
                        category: "Manifest Analysis",
                        description: f.description || "No description provided",
                        recommendation: "Review AndroidManifest.xml and restrict sensitive flags or permissions.",
                        cvss_score: f.cvss || null,
                        owasp_category: f.owasp_mobile || null,
                    }, "mobsf", context.scanId));
                }
            }

            // 2. Network Security findings
            if (Array.isArray(reportData?.network_security?.network_findings)) {
                for (const f of reportData.network_security.network_findings) {
                    if (f.severity === "secure" || f.severity === "info") continue;
                    findings.push(createFinding({
                        title: `Network Security: ${f.description?.substring(0, 80) || "Issue"}`,
                        severity: f.severity,
                        category: "Network Security Configuration",
                        description: f.description || "No description provided",
                        recommendation: "Ensure network security configuration disables cleartext and enforces certificate pinning.",
                        cvss_score: null,
                        owasp_category: "M3: Insecure Communication",
                    }, "mobsf", context.scanId));
                }
            }

            // 3. Static Code Analysis findings
            const rawCodeAnalysis = reportData?.code_analysis?.findings || reportData?.code_analysis;
            if (rawCodeAnalysis && typeof rawCodeAnalysis === "object") {
                for (const [findingId, f] of Object.entries(rawCodeAnalysis)) {
                    // Skip top-level MobSF summary/wrapper keys
                    if (findingId === "summary" || findingId === "findings") continue;
                    if (!f || typeof f !== "object") continue;

                    findings.push(createFinding({
                        title: f.title || f.description?.substring(0, 100) || findingId,
                        severity: f.severity,
                        category: "Static Code Analysis",
                        description: f.description || "No description provided",
                        recommendation: "Review the affected code block and apply standard security best practices.",
                        cvss_score: f.cvss || null,
                        owasp_category: f.owasp_mobile || null,
                    }, "mobsf", context.scanId));
                }
            }

            // 4. Certificate findings (high / warning)
            if (Array.isArray(reportData?.certificate_analysis?.certificate_findings)) {
                for (const cf of reportData.certificate_analysis.certificate_findings) {
                    if (Array.isArray(cf) && cf.length >= 2) {
                        const [sev, desc, title] = cf;
                        if (sev === "high" || sev === "warning") {
                            findings.push(createFinding({
                                title: title || desc?.substring(0, 80) || "Certificate Security Issue",
                                severity: sev,
                                category: "Certificate Analysis",
                                description: desc || "No description provided",
                                recommendation: "Use strong cryptographic certificates and valid signatures.",
                                cvss_score: null,
                                owasp_category: "M5: Insufficient Cryptography",
                            }, "mobsf", context.scanId));
                        }
                    }
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
