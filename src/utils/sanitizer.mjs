import { Logger } from "./logger.mjs";

export class ReportSanitizer {
    /**
     * Known false positive patterns that should be completely dropped.
     */
    static FALSE_POSITIVE_PATTERNS = [
        "loads a native library", 
        "executes a unix command", 
        "reads the iso country code", 
        "reads the mcc+mnc", 
        "reads the operator name", 
        "reads the network type", 
        "reads the device model", 
        "reads the device manufacturer",
        "reads the sim serial",
        "reads the device build",
        "reads the wi-fi",
        "lists the running processes",
        "lists the installed packages",
        "accessibilitynodeinfodumper",
        "windowmanager",
        "activitymanager",
        "boundsinparent",
        "boundsinscreen",
        "invisible child",
        "surfaceflinger",
        "inputdispatcher"
    ];

    /**
     * Patterns that indicate Serverless/Edge middleware functions.
     */
    static SERVERLESS_PATTERNS = [
        "cloudfunctions.net",     // Firebase/GCP
        "supabase.co/functions",  // Supabase Edge Functions
        "execute-api",            // AWS API Gateway / Lambda
        "workers.dev",            // Cloudflare Workers
        "vercel.app",             // Vercel Serverless
        "netlify.app"             // Netlify Functions
    ];

    /**
     * Filters out known noise and downgrades over-classified behavioral capabilities.
     * @param {Array} findings Raw findings from all engines
     * @returns {Array} Cleaned findings
     */
    static filterNoise(findings) {
        if (!findings || !Array.isArray(findings)) return [];

        const cleaned = [];
        let dropped = 0;

        for (const f of findings) {
            const desc = (f.description || "").toLowerCase();
            const engine = (f.engine || "").toLowerCase();
            let isFalsePositive = false;

            // 1. Drop known false positive patterns entirely
            for (const pattern of this.FALSE_POSITIVE_PATTERNS) {
                if (desc.includes(pattern)) {
                    isFalsePositive = true;
                    dropped++;
                    break;
                }
            }

            if (isFalsePositive) continue;

            // 2. Downgrade Androwarn behavioral capabilities that aren't dropped
            if (engine === "androwarn" && ["critical", "high"].includes((f.severity || "").toLowerCase())) {
                f.severity = "info"; // It's just a capability, not a confirmed vulnerability
                f.original_severity_downgraded = true;
            }

            cleaned.append ? cleaned.push(f) : cleaned.push(f);
        }

        Logger.info(`[Sanitizer] Dropped ${dropped} known false positive / noisy findings.`);
        return cleaned;
    }

    /**
     * Squashes duplicate findings (e.g. ZAP finding the same missing header on 80 different URLs)
     * into a single finding with an array of affected URLs/Endpoints.
     * @param {Array} findings 
     * @returns {Array} Deduplicated findings
     */
    static deduplicate(findings) {
        if (!findings || !Array.isArray(findings)) return [];
        
        const uniqueMap = new Map();

        for (const f of findings) {
            // Create a normalization key based on title/description (first 80 chars)
            // ZAP findings usually have identical names.
            const name = f.name || f.title || "";
            const descPrefix = (f.description || "").substring(0, 80);
            
            // Prefer name if available (ZAP uses name), fallback to description prefix (MobSF/Frida)
            const key = `${f.engine}_${name ? name : descPrefix}`.toLowerCase().trim();

            if (uniqueMap.has(key)) {
                // Merge this finding into the existing one
                const existing = uniqueMap.get(key);
                
                // Aggregate URLs if present
                if (!existing.affected_urls) existing.affected_urls = [];
                if (existing.url && !existing.affected_urls.includes(existing.url)) {
                    existing.affected_urls.push(existing.url);
                }
                if (f.url && !existing.affected_urls.includes(f.url)) {
                    existing.affected_urls.push(f.url);
                }

                // Increment occurrence counter
                existing.occurrence_count = (existing.occurrence_count || 1) + 1;
                
            } else {
                // First time seeing this finding
                f.occurrence_count = 1;
                if (f.url) f.affected_urls = [f.url];
                uniqueMap.set(key, f);
            }
        }

        const deduped = Array.from(uniqueMap.values());
        Logger.info(`[Sanitizer] Deduplication compressed ${findings.length} findings down to ${deduped.length} unique issues.`);
        return deduped;
    }

    /**
     * Analyzes URLs found by ZAP/Static analysis to detect Serverless Middlewares
     * and check if they belong to the app's core domain.
     * @param {Array} urls List of intercepted/scanned URLs
     * @param {String} primaryDomain The main domain extracted from the APK (optional)
     * @returns {Object} Analysis results
     */
    static analyzeScope(urls, primaryDomain = null) {
        const results = {
            usesServerless: false,
            serverlessProviders: [],
            outOfScopeUrls: [],
            inScopeUrls: []
        };

        if (!urls || urls.length === 0) return results;

        const uniqueUrls = [...new Set(urls)];

        for (const urlStr of uniqueUrls) {
            try {
                const u = new URL(urlStr);
                const host = u.hostname.toLowerCase();

                // Check for serverless/middleware patterns
                for (const pattern of this.SERVERLESS_PATTERNS) {
                    if (host.includes(pattern)) {
                        results.usesServerless = true;
                        if (!results.serverlessProviders.includes(pattern)) {
                            results.serverlessProviders.push(pattern);
                        }
                    }
                }

                // Domain correlation
                if (primaryDomain && !host.includes(primaryDomain)) {
                    // It's likely a third-party tracker, CDN, or unrelated API
                    results.outOfScopeUrls.push(urlStr);
                } else {
                    results.inScopeUrls.push(urlStr);
                }
            } catch (e) {
                // Invalid URL string, skip
            }
        }

        if (results.usesServerless) {
            Logger.info(`[Sanitizer] ⚠️ Serverless/Middleware Logic Detected: ${results.serverlessProviders.join(", ")}`);
            Logger.info(`[Sanitizer] Business logic is likely pushed to the edge functions.`);
        }

        return results;
    }

    /**
     * Main entry point to clean all findings before reporting.
     * @param {Array} rawFindings 
     * @returns {Array} Clean, deduplicated findings
     */
    static sanitize(rawFindings) {
        const noNoise = this.filterNoise(rawFindings);
        const squashed = this.deduplicate(noNoise);
        return squashed;
    }
}
