/**
 * Shinodroid — Androwarn Behavior Analysis Engine
 *
 * Static analysis that detects 12 categories of potentially malicious behavior:
 *   - Telephony ID exfiltration (IMEI, IMSI)
 *   - Geolocation leakage (GPS/WiFi)
 *   - Audio/video interception (call recording, camera)
 *   - Telephony abuse (premium SMS, phone calls)
 *   - PIM data leakage (contacts, SMS, clipboard)
 *   - Remote connections (sockets, Bluetooth, APN)
 *   - Privilege escalation (native code, JNI)
 *   - Denial of Service patterns
 *   - External storage access
 *   - Device settings exfiltration
 *   - Connection interface leaks (WiFi creds, BT MAC)
 *   - PIM data modification
 *
 * Requires: pip install androwarn (available as androwarn.exe on Windows)
 * Gracefully skips if androwarn is not installed.
 */

import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { promisify } from "node:util";
import { createFinding } from "./_engine-interface.mjs";

const execFileAsync = promisify(execFile);

// ── Androwarn JSON is: [{analysis_results: [[category, [strings]]]}] ──
// Map each category key to our severity + OWASP mapping
const CATEGORY_MAP = {
    "telephony_identifiers_leakage": { sev: "high", owasp: "M2: Insecure Data Storage", title: "Telephony Identifier Leakage" },
    "device_settings_harvesting": { sev: "medium", owasp: "M2: Insecure Data Storage", title: "Device Settings Harvesting" },
    "location_lookup": { sev: "high", owasp: "M2: Insecure Data Storage", title: "Geolocation Information Leakage" },
    "connection_interfaces_exfiltration": { sev: "medium", owasp: "M2: Insecure Data Storage", title: "Connection Interface Data Leak" },
    "telephony_services_abuse": { sev: "critical", owasp: "M1: Improper Platform Usage", title: "Telephony Service Abuse" },
    "audio_video_eavesdropping": { sev: "critical", owasp: "M1: Improper Platform Usage", title: "Audio/Video Interception" },
    "suspicious_connection_establishment": { sev: "high", owasp: "M3: Insecure Communication", title: "Suspicious Remote Connection" },
    "PIM_data_leakage": { sev: "high", owasp: "M2: Insecure Data Storage", title: "PIM Data Leakage" },
    "code_execution": { sev: "critical", owasp: "M7: Client Code Quality", title: "Arbitrary Code Execution" },
    "denial_of_service": { sev: "high", owasp: "M1: Improper Platform Usage", title: "Denial of Service Pattern" },
    "external_storage_operations": { sev: "medium", owasp: "M2: Insecure Data Storage", title: "External Storage Access" },
    "pim_data_modification": { sev: "high", owasp: "M2: Insecure Data Storage", title: "PIM Data Modification" },
};

export default {
    name: "Androwarn Behavior Analysis",
    type: "static",
    version: "1.0.0",

    async isAvailable() {
        try {
            // On Windows it's installed as androwarn.exe via pip
            await execFileAsync("androwarn", ["--help"], { timeout: 10000 });
            return true;
        } catch {
            return false;
        }
    },

    async run(apkPath, context) {
        const start = Date.now();

        // Androwarn appends .json to the -o path automatically
        // So if we pass "C:\path\report", it creates "C:\path\report.json"
        const outBase = join(context.outDir, `androwarn-${context.scanId}`);
        const outFile = `${outBase}.json`;

        try {
            context.log?.("info", "[Androwarn] Running behavior analysis...");

            await execFileAsync("androwarn", [
                "-i", apkPath,
                "-r", "json",
                "-v", "3",       // EXPERT verbosity — maximum detail
                "-o", outBase,   // androwarn adds .json extension
            ], {
                timeout: 180_000,  // 3 min timeout for large APKs
                maxBuffer: 50 * 1024 * 1024,  // 50MB — androwarn can be verbose
            });

            // ── Parse the JSON output ────────────────────────────────────
            let reportArray;
            try {
                const content = await readFile(outFile, "utf8");
                reportArray = JSON.parse(content);
            } catch (parseErr) {
                context.log?.("warn", `[Androwarn] Could not parse output: ${parseErr.message}`);
                return {
                    engine: "androwarn",
                    success: true,
                    findings: [],
                    metadata: { parseError: parseErr.message },
                    durationMs: Date.now() - start,
                };
            }

            // ── Extract analysis_results from the array ──────────────────
            // Androwarn output format: [{application_information: ...}, {analysis_results: [[cat, [items]]]}, ...]
            const analysisObj = reportArray.find(obj => obj.analysis_results);
            if (!analysisObj) {
                context.log?.("warn", "[Androwarn] No analysis_results found in output");
                return {
                    engine: "androwarn",
                    success: true,
                    findings: [],
                    metadata: { note: "No analysis_results section in output" },
                    durationMs: Date.now() - start,
                };
            }

            // analysis_results is an array of [category_name, [findings_strings]]
            const analysisResults = analysisObj.analysis_results;
            const findings = [];

            for (const [category, items] of analysisResults) {
                const mapping = CATEGORY_MAP[category];
                if (!mapping) continue;
                if (!Array.isArray(items) || items.length === 0) continue;

                for (const item of items) {
                    const description = typeof item === "string" ? item : String(item);
                    if (!description || description === "[]" || description.trim() === "") continue;

                    findings.push(createFinding({
                        title: mapping.title,
                        severity: mapping.sev,
                        category: "Behavior Analysis",
                        description: `Androwarn detected: ${description}`,
                        recommendation: `Review if the ${category.replace(/_/g, " ")} behavior is legitimate and necessary for the app's functionality.`,
                        owasp_category: mapping.owasp,
                    }, "androwarn", context.scanId));
                }
            }

            // ── Extract app info for metadata ────────────────────────────
            const appInfoObj = reportArray.find(obj => obj.application_information);
            const appInfo = {};
            if (appInfoObj?.application_information) {
                for (const [key, values] of appInfoObj.application_information) {
                    appInfo[key] = values?.[0] || null;
                }
            }

            context.log?.("ok", `[Androwarn] Found ${findings.length} behavior indicators across ${analysisResults.length} categories`);

            return {
                engine: "androwarn",
                success: true,
                findings,
                metadata: {
                    categoriesAnalyzed: analysisResults.length,
                    totalIndicators: findings.length,
                    appName: appInfo.application_name || null,
                    packageName: appInfo.package_name || null,
                    appVersion: appInfo.application_version || null,
                },
                durationMs: Date.now() - start,
            };

        } catch (err) {
            return {
                engine: "androwarn",
                success: false,
                findings: [],
                metadata: {},
                error: err.message,
                durationMs: Date.now() - start,
            };
        } finally {
            // Clean up temp report
            try { await unlink(outFile); } catch { /* file may not exist */ }
        }
    },
};
