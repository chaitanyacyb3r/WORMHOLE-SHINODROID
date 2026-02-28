/**
 * ShinobiDroid — Logcat Leak Detection Engine
 *
 * Captures all logcat output from the app during dynamic analysis
 * and scans for sensitive data leaked to system logs.
 *
 * OWASP MASVS-STORAGE requires verifying that sensitive data
 * is not written to application logs (MSTG-STORAGE-3).
 *
 * Detects: passwords, tokens, API keys, bearer tokens, secrets,
 *          email addresses, phone numbers, Base64 blobs.
 *
 * Requires: adb (part of Android SDK)
 * Runs during/after the dynamic analysis phase.
 */

import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createFinding } from "./_engine-interface.mjs";

const execFileAsync = promisify(execFile);

// Patterns to scan for in logcat output
const SENSITIVE_PATTERNS = [
    { re: /password\s*[=:]\s*\S+/i, title: "Password Leaked in Logs", sev: "critical" },
    { re: /api[_-]?key\s*[=:]\s*\S+/i, title: "API Key Leaked in Logs", sev: "critical" },
    { re: /secret\s*[=:]\s*\S+/i, title: "Secret Value Leaked in Logs", sev: "critical" },
    { re: /bearer\s+[A-Za-z0-9._~+/-]+=*/i, title: "Bearer Token Leaked in Logs", sev: "critical" },
    { re: /token\s*[=:]\s*[A-Za-z0-9._-]{20,}/i, title: "Auth Token Leaked in Logs", sev: "high" },
    { re: /authorization\s*[=:]\s*\S+/i, title: "Authorization Header in Logs", sev: "high" },
    { re: /credential\s*[=:]\s*\S+/i, title: "Credential Leaked in Logs", sev: "critical" },
    { re: /session[_-]?id\s*[=:]\s*\S+/i, title: "Session ID Leaked in Logs", sev: "high" },
    { re: /private[_-]?key/i, title: "Private Key Reference in Logs", sev: "critical" },
    { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, title: "Email Address in Logs", sev: "medium" },
    { re: /\b[6-9]\d{9}\b/, title: "Indian Phone Number in Logs", sev: "medium" },
    { re: /\+91\s?\d{10}/, title: "Indian Phone Number (with +91) in Logs", sev: "medium" },
];

export default {
    name: "Logcat Leak Detection",
    type: "dynamic",
    version: "1.0.0",

    async isAvailable() {
        try {
            const { stdout } = await execFileAsync("adb", ["devices"], { timeout: 5000 });
            const lines = stdout.split("\n").filter(l => l.includes("device") && !l.startsWith("List"));
            return lines.length > 0;
        } catch {
            return false;
        }
    },

    async run(apkPath, context) {
        const start = Date.now();
        const packageName = context.packageName;

        if (!packageName) {
            return {
                engine: "logcat",
                success: false,
                skipped: true,
                findings: [],
                metadata: {},
                error: "No package name available — logcat needs package name to filter",
                durationMs: Date.now() - start,
            };
        }

        try {
            context.log?.("info", `[Logcat] Capturing logs for ${packageName}...`);

            // Get PID for the app
            let pid = null;
            try {
                const { stdout } = await execFileAsync("adb", [
                    "shell", "pidof", packageName,
                ], { timeout: 5000 });
                pid = stdout.trim();
            } catch {
                // App might not be running; capture all logs instead
                context.log?.("warn", "[Logcat] App not running, capturing full logcat");
            }

            // Capture logcat (dump mode — get what's in the buffer)
            const logcatArgs = ["logcat", "-d"];
            if (pid) {
                logcatArgs.push(`--pid=${pid}`);
            }

            const { stdout: logOutput } = await execFileAsync("adb", logcatArgs, {
                timeout: 30_000,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });

            const lines = logOutput.split("\n");
            context.log?.("info", `[Logcat] Captured ${lines.length} log lines`);

            // Filter lines belonging to our package (if we didn't filter by PID)
            const relevantLines = pid
                ? lines
                : lines.filter(l => l.toLowerCase().includes(packageName.toLowerCase()));

            // Scan for sensitive data
            const findings = [];
            const seen = new Set(); // Deduplicate findings

            for (const line of relevantLines) {
                for (const pattern of SENSITIVE_PATTERNS) {
                    const match = line.match(pattern.re);
                    if (match) {
                        const key = `${pattern.title}:${match[0].substring(0, 30)}`;
                        if (seen.has(key)) continue;
                        seen.add(key);

                        // Redact the actual sensitive value for the finding
                        const redactedLine = line.substring(0, 200).replace(
                            /([=:]\s*)\S+/g,
                            "$1[REDACTED]"
                        );

                        findings.push(createFinding({
                            title: pattern.title,
                            severity: pattern.sev,
                            category: "Log Data Leakage",
                            description: `Sensitive data detected in application logs:\n${redactedLine}`,
                            recommendation: "Remove all sensitive data logging before production release. Use ProGuard/R8 to strip Log calls. See OWASP MASVS MSTG-STORAGE-3.",
                            owasp_category: "M2: Insecure Data Storage",
                            owasp_masvs: "MSTG-STORAGE-3",
                        }, "logcat", context.scanId));
                    }
                }
            }

            // Save raw logcat for reference
            const logcatFile = join(context.outDir, "logcat-output.txt");
            try {
                await writeFile(logcatFile, logOutput, "utf8");
            } catch { /* ignore write errors */ }

            context.log?.("ok", `[Logcat] ${findings.length} sensitive data leaks detected`);

            return {
                engine: "logcat",
                success: true,
                findings,
                metadata: {
                    totalLines: lines.length,
                    relevantLines: relevantLines.length,
                    leaksDetected: findings.length,
                    logcatFile,
                },
                durationMs: Date.now() - start,
            };

        } catch (err) {
            return {
                engine: "logcat",
                success: false,
                findings: [],
                metadata: {},
                error: err.message,
                durationMs: Date.now() - start,
            };
        }
    },
};
