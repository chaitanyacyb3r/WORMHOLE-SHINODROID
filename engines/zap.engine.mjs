/**
 * OWASP ZAP Engine — Network Interception + Backend Scanning
 * Shinodroid — MASVS-NETWORK / OWASP Top 10
 *
 * This engine:
 *   1. Feeds discovered endpoints (from MobSF + Frida) to ZAP's spider
 *   2. Runs ZAP's active scanner (SQLi, XSS, SSRF, IDOR, path traversal, etc.)
 *   3. Pulls alerts via ZAP REST API → maps to Shinodroid findings
 *   4. Downloads ZAP HTML report for the scan output directory
 *
 * ZAP runs as a daemon (Docker or local) on port 8080 (proxy) + 8081 (API).
 * During dynamic analysis, the emulator routes traffic through ZAP for passive capture.
 * This engine runs in Phase 3 (network) — after dynamic analysis has generated traffic.
 *
 * Cost: $0.00 — fully deterministic, no AI calls.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFinding, normalizeSeverity, getSeverityOrder } from "./_engine-interface.mjs";

// ── Configuration ───────────────────────────────────────────────────────────

const ZAP_API_URL = process.env.ZAP_API_URL || "http://localhost:8080";
const ZAP_API_KEY = process.env.ZAP_API_KEY || "shinodroid-zap-key";
const ZAP_SCAN_TIMEOUT = parseInt(process.env.ZAP_SCAN_TIMEOUT || "600000", 10); // 10 min default
const ZAP_POLL_INTERVAL = 5000; // poll every 5s

// ── Helpers ─────────────────────────────────────────────────────────────────

async function zapFetch(path, params = {}) {
    const url = new URL(path, ZAP_API_URL);
    url.searchParams.set("apikey", ZAP_API_KEY);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`ZAP API ${res.status}: ${res.statusText}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function zapFetchRaw(path, params = {}) {
    const url = new URL(path, ZAP_API_URL);
    url.searchParams.set("apikey", ZAP_API_KEY);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`ZAP API ${res.status}`);
    return await res.text();
}

/**
 * Poll a ZAP status endpoint until it reaches 100 or timeout.
 */
async function pollUntilDone(statusPath, label, log, timeout = ZAP_SCAN_TIMEOUT) {
    const start = Date.now();
    let lastProgress = -1;

    while (Date.now() - start < timeout) {
        try {
            const data = await zapFetch(statusPath);
            const progress = parseInt(data.status || data.scanProgress || "0", 10);

            if (progress !== lastProgress) {
                log("info", `  ${label}: ${progress}%`);
                lastProgress = progress;
            }

            if (progress >= 100) return true;
        } catch (err) {
            log("warn", `  ${label} poll error: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, ZAP_POLL_INTERVAL));
    }

    log("warn", `  ${label} timed out after ${Math.round(timeout / 1000)}s`);
    return false;
}

// ── ZAP Risk → Shinodroid Severity ──────────────────────────────────────────

function mapZapRisk(riskCode) {
    // ZAP: 0=Informational, 1=Low, 2=Medium, 3=High
    switch (parseInt(riskCode, 10)) {
        case 3: return "high";
        case 2: return "medium";
        case 1: return "low";
        default: return "info";
    }
}

function mapZapConfidence(confidenceCode) {
    switch (parseInt(confidenceCode, 10)) {
        case 3: return "high";
        case 2: return "medium";
        case 1: return "low";
        default: return "informational";
    }
}

// ── Scan Aggressiveness Selection ───────────────────────────────────────────

/**
 * Determine scan aggressiveness based on MobSF static analysis.
 *
 * Logic (AI-decided based on static report):
 *   - If MobSF found critical/high code_analysis findings → FULL scan
 *   - If MobSF found network-related issues (cleartext, weak SSL) → STANDARD scan
 *   - Otherwise → LIGHT scan (fast, saves time)
 *
 * @param {object|null} mobsfReport
 * @returns {"light"|"standard"|"full"}
 */
function determineScanAggression(mobsfReport) {
    if (!mobsfReport) return "standard";

    let hasCritical = false;
    let hasNetworkIssues = false;

    // Check code_analysis findings
    if (mobsfReport.code_analysis) {
        for (const finding of Object.values(mobsfReport.code_analysis)) {
            const sev = (finding.severity || "").toLowerCase();
            if (sev === "high" || sev === "danger" || sev === "critical") {
                hasCritical = true;
            }
            const desc = (finding.description || "").toLowerCase();
            if (desc.includes("cleartext") || desc.includes("ssl") || desc.includes("http://") ||
                desc.includes("certificate") || desc.includes("tls")) {
                hasNetworkIssues = true;
            }
        }
    }

    // Check permissions for INTERNET / network state
    if (mobsfReport.permissions) {
        const perms = Object.keys(mobsfReport.permissions).join(" ").toLowerCase();
        if (perms.includes("internet")) hasNetworkIssues = true;
    }

    if (hasCritical) return "full";
    if (hasNetworkIssues) return "standard";
    return "light";
}

/**
 * Configure ZAP scanner strength based on aggressiveness level.
 */
async function configureScanPolicy(level, log) {
    try {
        switch (level) {
            case "light":
                // Only high-confidence, fast checks
                await zapFetch("/JSON/ascan/action/setOptionMaxScansInUI/", { Integer: "5" });
                await zapFetch("/JSON/ascan/action/setOptionThreadPerHost/", { Integer: "2" });
                log("info", `  Scan policy: LIGHT (fast, ~2 min)`);
                break;
            case "full":
                // Exhaustive testing
                await zapFetch("/JSON/ascan/action/setOptionMaxScansInUI/", { Integer: "12" });
                await zapFetch("/JSON/ascan/action/setOptionThreadPerHost/", { Integer: "5" });
                log("info", `  Scan policy: FULL (thorough, ~10-15 min)`);
                break;
            default:
                // Balanced
                await zapFetch("/JSON/ascan/action/setOptionMaxScansInUI/", { Integer: "8" });
                await zapFetch("/JSON/ascan/action/setOptionThreadPerHost/", { Integer: "3" });
                log("info", `  Scan policy: STANDARD (balanced, ~5 min)`);
                break;
        }
    } catch (err) {
        log("warn", `  Could not configure scan policy: ${err.message}`);
    }
}

// ── Main Engine ─────────────────────────────────────────────────────────────

const zapEngine = {
    name: "OWASP ZAP",
    type: "network",
    version: "2.16.0",

    async isAvailable() {
        try {
            const data = await zapFetch("/JSON/core/view/version/");
            return !!data.version;
        } catch {
            return false;
        }
    },

    /**
     * @param {string} apkPath
     * @param {import("./_engine-interface.mjs").EngineContext} context
     */
    async run(apkPath, context) {
        const log = context.log || console.log;
        const notify = context.onProgress || (() => { });
        const findings = [];
        const metadata = { alertCount: 0, spideredUrls: 0, scanLevel: "standard" };

        // ── Collect target URLs ──────────────────────────────────────────
        const targetUrls = new Set();

        // From MobSF: extracted URLs/endpoints
        if (context.endpoints && context.endpoints.length > 0) {
            for (const url of context.endpoints) {
                if (url && url.startsWith("http")) targetUrls.add(url);
            }
        }

        // From MobSF report: urls field
        if (context.mobsfReport?.urls) {
            for (const urlEntry of context.mobsfReport.urls) {
                const url = urlEntry.url || urlEntry;
                if (typeof url === "string" && url.startsWith("http")) targetUrls.add(url);
            }
        }

        // From MobSF report: domains
        if (context.mobsfReport?.domains) {
            for (const domain of Object.keys(context.mobsfReport.domains)) {
                if (domain && !domain.includes("localhost") && !domain.includes("127.0.0.1")) {
                    targetUrls.add(`https://${domain}`);
                }
            }
        }

        // From ZAP's own passive capture (traffic generated during dynamic analysis)
        try {
            const sites = await zapFetch("/JSON/core/view/sites/");
            if (sites.sites) {
                for (const site of sites.sites) {
                    targetUrls.add(site);
                }
            }
        } catch { /* ZAP might not have captured any traffic yet */ }

        if (targetUrls.size === 0) {
            log("warn", "No target URLs found — skipping ZAP scan");
            return {
                engine: "zap",
                success: true,
                findings: [],
                metadata: { ...metadata, reason: "No endpoints discovered" },
                skipped: true,
            };
        }

        log("info", `Found ${targetUrls.size} target URL(s) for scanning`);
        for (const url of [...targetUrls].slice(0, 10)) {
            log("info", `  • ${url}`);
        }

        // ── Determine scan aggressiveness ────────────────────────────────
        const scanLevel = determineScanAggression(context.mobsfReport);
        metadata.scanLevel = scanLevel;
        await configureScanPolicy(scanLevel, log);

        // ── Phase 1: Spider discovered endpoints ─────────────────────────
        notify("🕷️ ZAP: Spidering discovered endpoints...");
        let spideredCount = 0;

        for (const url of targetUrls) {
            try {
                // Filter: only spider external, reachable endpoints
                // Skip: localhost, private IPs, google/facebook/etc. (third-party SDKs)
                const hostname = new URL(url).hostname;
                if (isThirdPartyDomain(hostname)) {
                    log("info", `  Skipping third-party: ${hostname}`);
                    continue;
                }

                const result = await zapFetch("/JSON/spider/action/scan/", {
                    url,
                    maxChildren: "50",
                    recurse: "true",
                    subtreeOnly: "true",
                });

                if (result.scan) {
                    await pollUntilDone(
                        `/JSON/spider/view/status/?scanId=${result.scan}`,
                        `Spider [${hostname}]`,
                        log,
                        60_000 // 1 min per domain
                    );
                    spideredCount++;
                }
            } catch (err) {
                log("warn", `  Spider failed for ${url}: ${err.message}`);
            }
        }

        metadata.spideredUrls = spideredCount;
        log("ok", `Spidered ${spideredCount} endpoint(s)`);

        // ── Phase 2: Active vulnerability scan ───────────────────────────
        notify("🔍 ZAP: Running active vulnerability scanner...");

        const scannedUrls = new Set();
        for (const url of targetUrls) {
            try {
                const hostname = new URL(url).hostname;
                if (isThirdPartyDomain(hostname)) continue;
                if (scannedUrls.has(hostname)) continue; // one scan per domain
                scannedUrls.add(hostname);

                const result = await zapFetch("/JSON/ascan/action/scan/", {
                    url,
                    recurse: "true",
                    inScopeOnly: "false",
                });

                if (result.scan) {
                    const timeoutForLevel = {
                        light: 120_000,    // 2 min
                        standard: 300_000, // 5 min
                        full: 600_000,     // 10 min
                    }[scanLevel] || 300_000;

                    await pollUntilDone(
                        `/JSON/ascan/view/status/?scanId=${result.scan}`,
                        `Active Scan [${hostname}]`,
                        log,
                        timeoutForLevel
                    );
                }
            } catch (err) {
                log("warn", `  Active scan failed for ${url}: ${err.message}`);
            }
        }

        // ── Phase 3: Retrieve alerts ─────────────────────────────────────
        notify("📋 ZAP: Collecting vulnerability alerts...");

        try {
            const alertsData = await zapFetch("/JSON/alert/view/alerts/", {
                start: "0",
                count: "500",
            });

            const alerts = alertsData.alerts || [];
            metadata.alertCount = alerts.length;
            log("info", `ZAP found ${alerts.length} alert(s)`);

            // Deduplicate by (name + url) to avoid reporting same finding 50x
            const seen = new Set();

            for (const alert of alerts) {
                const dedupeKey = `${alert.name}|${alert.url}`;
                if (seen.has(dedupeKey)) continue;
                seen.add(dedupeKey);

                const severity = mapZapRisk(alert.risk);
                const confidence = mapZapConfidence(alert.confidence);

                // Skip informational with low confidence (noise)
                if (severity === "info" && confidence === "low") continue;

                const finding = createFinding({
                    title: alert.name || "ZAP Finding",
                    severity,
                    category: alert.name || "Network Security",
                    description: buildDescription(alert),
                    recommendation: alert.solution || "Review and remediate the identified vulnerability.",
                    cvss_score: alert.riskcode >= 3 ? 8.0 : alert.riskcode >= 2 ? 5.5 : alert.riskcode >= 1 ? 3.0 : null,
                    owasp_category: mapZapCweToOwasp(alert.cweid),
                    owasp_masvs: mapToMasvs(alert),
                }, "zap", context.scanId);

                findings.push(finding);
            }

            log("ok", `Mapped ${findings.length} unique findings (deduplicated from ${alerts.length} alerts)`);

        } catch (err) {
            log("error", `Failed to retrieve ZAP alerts: ${err.message}`);
        }

        // ── Phase 4: Save ZAP HTML report ────────────────────────────────
        if (context.outDir) {
            try {
                const html = await zapFetchRaw("/OTHER/core/other/htmlreport/");
                const reportPath = join(context.outDir, "zap-report.html");
                await writeFile(reportPath, html, "utf-8");
                metadata.htmlReportPath = reportPath;
                log("ok", `ZAP HTML report saved: ${reportPath}`);
            } catch (err) {
                log("warn", `Could not save ZAP HTML report: ${err.message}`);
            }
        }

        // ── Phase 5: Cleanup — remove all alerts for next scan ───────────
        try {
            await zapFetch("/JSON/alert/action/deleteAllAlerts/");
        } catch { /* non-critical */ }

        // ── Summary ──────────────────────────────────────────────────────
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const f of findings) {
            if (counts[f.severity] !== undefined) counts[f.severity]++;
        }
        log("ok", `ZAP summary: ${counts.high}H ${counts.medium}M ${counts.low}L ${counts.info}I (scan level: ${scanLevel})`);

        return {
            engine: "zap",
            success: true,
            findings,
            metadata,
        };
    },
};

// ── Helper Functions ────────────────────────────────────────────────────────

function buildDescription(alert) {
    const parts = [];
    if (alert.description) parts.push(alert.description);
    if (alert.url) parts.push(`\n**URL:** ${alert.url}`);
    if (alert.method) parts.push(`**Method:** ${alert.method}`);
    if (alert.param) parts.push(`**Parameter:** ${alert.param}`);
    if (alert.attack) parts.push(`**Attack:** ${alert.attack}`);
    if (alert.evidence) parts.push(`**Evidence:** ${alert.evidence.substring(0, 300)}`);
    if (alert.other) parts.push(`\n**Details:** ${alert.other.substring(0, 500)}`);
    return parts.join("\n") || "No description available.";
}

/**
 * Skip well-known third-party domains that we shouldn't actively scan.
 */
function isThirdPartyDomain(hostname) {
    const skipDomains = [
        "google.com", "googleapis.com", "gstatic.com", "googleusercontent.com",
        "facebook.com", "fbcdn.net", "facebook.net",
        "apple.com", "icloud.com",
        "amazonaws.com", "cloudfront.net", "aws.amazon.com",
        "firebase.io", "firebaseio.com", "firebaseapp.com",
        "crashlytics.com", "fabric.io",
        "doubleclick.net", "googlesyndication.com",
        "mixpanel.com", "segment.com", "amplitude.com",
        "sentry.io", "bugsnag.com",
        "branch.io", "adjust.com", "appsflyer.com",
        "localhost", "127.0.0.1", "10.0.2.2",
    ];
    return skipDomains.some(d => hostname.endsWith(d) || hostname === d);
}

/**
 * Map ZAP CWE IDs to OWASP Mobile Top 10 categories.
 */
function mapZapCweToOwasp(cweid) {
    const cwe = parseInt(cweid, 10);
    if (!cwe) return null;

    // SQL Injection, Command Injection
    if ([89, 78, 77, 90, 91, 564].includes(cwe)) return "M7: Client Code Quality";
    // XSS
    if ([79, 80].includes(cwe)) return "M7: Client Code Quality";
    // Broken Auth
    if ([287, 306, 384, 613].includes(cwe)) return "M4: Insecure Authentication";
    // Sensitive Data
    if ([200, 312, 319, 315, 311, 327].includes(cwe)) return "M2: Insecure Data Storage";
    // Network
    if ([295, 297, 523].includes(cwe)) return "M3: Insecure Communication";
    // SSRF, path traversal
    if ([918, 22, 23].includes(cwe)) return "M10: Extraneous Functionality";
    // CSRF
    if ([352].includes(cwe)) return "M6: Insecure Authorization";
    // Information Disclosure
    if ([16, 200, 209].includes(cwe)) return "M9: Reverse Engineering";

    return null;
}

/**
 * Map ZAP alert to MASVS test ID if applicable.
 */
function mapToMasvs(alert) {
    const name = (alert.name || "").toLowerCase();

    if (name.includes("sql injection")) return "MSTG-PLATFORM-2";
    if (name.includes("cross-site scripting") || name.includes("xss")) return "MSTG-PLATFORM-2";
    if (name.includes("ssl") || name.includes("tls") || name.includes("certificate")) return "MSTG-NETWORK-1";
    if (name.includes("cleartext") || name.includes("http://")) return "MSTG-NETWORK-2";
    if (name.includes("cors")) return "MSTG-NETWORK-1";
    if (name.includes("cookie")) return "MSTG-STORAGE-12";
    if (name.includes("header") && name.includes("security")) return "MSTG-NETWORK-4";
    if (name.includes("session") || name.includes("authentication")) return "MSTG-AUTH-1";
    if (name.includes("directory") || name.includes("traversal")) return "MSTG-PLATFORM-2";

    return null;
}

export default zapEngine;
