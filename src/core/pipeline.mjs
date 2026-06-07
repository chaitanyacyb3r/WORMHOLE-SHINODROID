import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { runAllEngines } from "../../orchestrator.mjs";
import { ConvexService } from "../services/convex.service.mjs";
import { Logger } from "../utils/logger.mjs";
import { Config } from "../config/config.mjs";
import { formatBytes, elapsed, sanitizeErrorMessage } from "../utils/helpers.mjs";
import { ReportSanitizer } from "../utils/sanitizer.mjs";
import { ComplianceMapper } from "../utils/compliance-map.mjs";

export class AnalysisPipeline {
    /**
     * Executes the full orchestrator analysis pipeline on a file buffer.
     * Optionally syncs results to Convex if a scanId is provided.
     *
     * @param {Buffer} fileBuffer 
     * @param {string} fileName 
     * @param {object} options 
     */
    static async run(fileBuffer, fileName, options = {}) {
        const { scanId = `local-${Date.now()}`, source = "local", onProgress } = options;
        const jobStart = Date.now();
        
        Logger.info(`╔══════════════════════════════════════════════════════════╗`);
        Logger.info(`║  NEW JOB: ${fileName.padEnd(45)}║`);
        Logger.info(`║  Scan ID: ${scanId.padEnd(45)}║`);
        Logger.info(`║  Source:  ${source.padEnd(45)}║`);
        Logger.info(`║  Size:    ${formatBytes(fileBuffer.length).padEnd(45)}║`);
        Logger.info(`╚══════════════════════════════════════════════════════════╝`);

        const tempApkPath = join(tmpdir(), `Shinodroid-${scanId}.apk`);

        try {
            if (fileBuffer.length > Config.MAX_APK_SIZE) {
                throw new Error(`APK exceeds maximum size of ${formatBytes(Config.MAX_APK_SIZE)}`);
            }

            // Sync to DB
            if (source === "convex") {
                Logger.step("[1/5] Updating scan status → scanning...");
                await ConvexService.updateScanStatus({ id: scanId, status: "scanning" });
            }

            // Write APK to temp
            Logger.step(`[2/5] APK written to temp: ${tempApkPath}`);
            await writeFile(tempApkPath, fileBuffer);

            // Output dir
            const outDir = join(Config.REPORTS_DIR, scanId);
            await mkdir(outDir, { recursive: true });

            // Run Orchestrator
            Logger.step("[3/5] Launching engine orchestrator...");
            const engineContext = {
                scanId,
                outDir,
                fileName,
                allFindings: [],
                endpoints: [],
                log: Logger.legacy,
                onProgress: (msg) => {
                    Logger.info(`  ${msg}`);
                    if (onProgress) onProgress(msg);
                },
            };

            const engineStart = Date.now();
            const result = await runAllEngines(tempApkPath, engineContext);
            Logger.ok(`All engines finished in ${elapsed(engineStart)}`);

            // --- SANITIZE FINDINGS ---
            Logger.step("[3.5/5] Sanitizing and deduplicating findings...");
            result.findings = ReportSanitizer.sanitize(result.findings);
            result.summary.totalFindings = result.findings.length;
            
            // Scope Analysis (Check for Serverless/Middleware)
            const scopeAnalysis = ReportSanitizer.analyzeScope(engineContext.endpoints);

            // --- COMPLIANCE MAPPING ---
            Logger.step("[3.6/5] Mapping findings to compliance frameworks (MASVS, GDPR, PCI-DSS)...");
            ComplianceMapper.enrichFindings(result.findings);

            // Extract engine breakdown
            const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
            const engineBreakdown = {};
            for (const f of result.findings) {
                if (counts[f.severity] !== undefined) counts[f.severity]++;
                engineBreakdown[f.engine] = (engineBreakdown[f.engine] || 0) + 1;
            }

            for (const [eng, count] of Object.entries(engineBreakdown)) {
                Logger.info(`  📊 ${eng}: ${count} findings`);
            }

            if (source === "convex") {
                Logger.step(`[4/5] Saving ${result.findings.length} findings to DB...`);
                await ConvexService.insertFindings(result.findings, scanId);

                Logger.step("[5/5] Uploading reports to Storage...");
                const mobsfEngine = result.engines.find(e => e.engine === "mobsf");
                const fridaEngine = result.engines.find(e => e.engine === "frida");

                let reportStorageId = null;
                if (mobsfEngine?.metadata?.outDir) {
                    reportStorageId = await ConvexService.uploadToStorage(join(mobsfEngine.metadata.outDir, "report.pdf"), "application/pdf");
                }

                let dynamicReportStorageId = null;
                if (fridaEngine?.metadata?.dynamicPdfPath) {
                    dynamicReportStorageId = await ConvexService.uploadToStorage(fridaEngine.metadata.dynamicPdfPath, "application/pdf");
                }

                const aiEngine = result.engines.find(e => e.engine === "ai");
                let aiReportStorageId = null;
                if (aiEngine?.metadata?.pdfReportPath) {
                    aiReportStorageId = await ConvexService.uploadToStorage(aiEngine.metadata.pdfReportPath, "application/pdf");
                }

                // Upload PoC report if generated
                const pocEngine = result.engines.find(e => e.engine === "poc-generator");
                let pocReportStorageId = null;
                if (pocEngine?.metadata?.pocReportPath) {
                    pocReportStorageId = await ConvexService.uploadToStorage(pocEngine.metadata.pocReportPath, "text/markdown");
                }

                const reportJson = mobsfEngine?.success ? {
                    security_score: mobsfEngine.metadata?.securityScore || 0,
                    average_cvss: mobsfEngine.metadata?.averageCvss || 0,
                    app_name: mobsfEngine.metadata?.appName || fileName,
                    package_name: mobsfEngine.metadata?.packageName || "Unknown",
                    version_name: mobsfEngine.metadata?.versionName || "Unknown",
                    mobsf_hash: mobsfEngine.metadata?.hash || null,
                    serverless_detected: scopeAnalysis.usesServerless,
                    serverless_providers: scopeAnalysis.serverlessProviders,
                    // PoC generation metadata
                    ...(pocEngine?.success && !pocEngine?.skipped ? {
                        poc_total: pocEngine.metadata?.totalPocs || 0,
                        poc_tier1: pocEngine.metadata?.tier1Count || 0,
                        poc_tier2: pocEngine.metadata?.tier2Count || 0,
                        poc_tier3: pocEngine.metadata?.tier3Count || 0,
                    } : {}),
                } : {};

                await ConvexService.updateScanStatus({
                    id: scanId,
                    status: "completed",
                    completedAt: Date.now(),
                    findingsCritical: counts.critical,
                    findingsHigh: counts.high,
                    findingsMedium: counts.medium,
                    findingsLow: counts.low,
                    findingsInfo: counts.info,
                    reportJson,
                    reportStorageId: reportStorageId || undefined,
                    dynamicReportStorageId: dynamicReportStorageId || undefined,
                    aiReportStorageId: aiReportStorageId || undefined,
                    pocReportStorageId: pocReportStorageId || undefined,
                });
            }

            Logger.ok(`╔══════════════════════════════════════════════════════════╗`);
            Logger.ok(`║  JOB COMPLETE: ${fileName.padEnd(40)}║`);
            Logger.ok(`╠══════════════════════════════════════════════════════════╣`);
            Logger.ok(`║  Engines:  ${String(result.summary.enginesRun).padStart(2)} ran │ ${String(result.summary.enginesSkipped).padStart(2)} skipped │ ${String(result.summary.enginesFailed).padStart(2)} failed      ║`);
            Logger.ok(`║  Findings: ${String(counts.critical).padStart(2)}C ${String(counts.high).padStart(2)}H ${String(counts.medium).padStart(2)}M ${String(counts.low).padStart(2)}L ${String(counts.info).padStart(2)}I  (${result.summary.totalFindings} total)${" ".repeat(Math.max(0, 14 - String(result.summary.totalFindings).length))}║`);
            Logger.ok(`║  Duration: ${elapsed(jobStart).padEnd(45)}║`);
            Logger.ok(`╚══════════════════════════════════════════════════════════╝`);

            return { success: true, result, outDir, counts };

        } catch (err) {
            Logger.error(`Job failed: ${err.message}`);
            if (source === "convex") {
                await ConvexService.updateScanStatus({
                    id: scanId,
                    status: "failed",
                    errorMessage: sanitizeErrorMessage(err.message),
                    completedAt: Date.now(),
                });
            }
            return { success: false, error: err.message };
        } finally {
            try { await unlink(tempApkPath); } catch { /* ignore */ }
        }
    }
}
