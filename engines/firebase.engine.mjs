/**
 * Shinodroid — Firebase Misconfiguration Detection Engine
 *
 * Extracts Firebase project URLs from the APK's static analysis report
 * and checks for common misconfigurations:
 *   - Open Firebase Realtime Database (no auth required)
 *   - Open Firebase Cloud Storage buckets
 *   - Exposed API keys in google-services.json
 *
 * This is a MASSIVE vulnerability in Indian fintech/edtech apps.
 * Many developers leave Firebase rules as read:true/write:true during dev.
 *
 * No external tool dependency — uses built-in Node.js fetch.
 * Requires: MobSF report (to extract Firebase URLs) — runs as static engine.
 */

import { createFinding } from "./_engine-interface.mjs";

// Regex patterns to find Firebase URLs in APK strings/resources
const FIREBASE_URL_PATTERNS = [
    /https?:\/\/([a-z0-9-]+)\.firebaseio\.com/gi,
    /https?:\/\/([a-z0-9-]+)\.firebasestorage\.googleapis\.com/gi,
    /([a-z0-9-]+)\.firebaseapp\.com/gi,
];

// Pattern to find Google API keys
const API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/g;

export default {
    name: "Firebase Misconfiguration Detector",
    // IMPORTANT: Type is 'dynamic' (not 'static') because this engine
    // needs context.mobsfReport from the MobSF static engine.
    // Static engines run in parallel in Phase 1 — the MobSF report
    // wouldn't be available yet. By running in Phase 2 (dynamic),
    // we guarantee context enrichment has already happened.
    type: "dynamic",
    version: "1.0.0",

    /**
     * Always available — uses built-in fetch, no external tool needed.
     * But only produces findings if the app uses Firebase.
     */
    async isAvailable() {
        return true;
    },

    async run(apkPath, context) {
        const start = Date.now();
        const findings = [];

        try {
            // We need either MobSF report strings or raw APK analysis
            const reportData = context.mobsfReport;
            if (!reportData) {
                return {
                    engine: "firebase",
                    success: true,
                    findings: [],
                    metadata: { note: "No MobSF report available — cannot extract Firebase URLs" },
                    durationMs: Date.now() - start,
                };
            }

            // Extract all strings from MobSF report to find Firebase URLs
            const allStrings = extractStringsFromReport(reportData);
            const firebaseProjects = new Set();
            const apiKeys = new Set();

            for (const str of allStrings) {
                for (const pattern of FIREBASE_URL_PATTERNS) {
                    pattern.lastIndex = 0;
                    let match;
                    while ((match = pattern.exec(str)) !== null) {
                        firebaseProjects.add(match[1]);
                    }
                }
                // Find API keys
                API_KEY_PATTERN.lastIndex = 0;
                let keyMatch;
                while ((keyMatch = API_KEY_PATTERN.exec(str)) !== null) {
                    apiKeys.add(keyMatch[0]);
                }
            }

            if (firebaseProjects.size === 0 && apiKeys.size === 0) {
                context.log?.("info", "[Firebase] No Firebase URLs found — app may not use Firebase");
                return {
                    engine: "firebase",
                    success: true,
                    findings: [],
                    metadata: { firebaseDetected: false },
                    durationMs: Date.now() - start,
                };
            }

            context.log?.("info", `[Firebase] Found ${firebaseProjects.size} Firebase project(s) and ${apiKeys.size} API key(s)`);

            // Check each Firebase project for misconfigurations
            for (const project of firebaseProjects) {
                // Test 1: Open Realtime Database
                try {
                    const dbUrl = `https://${project}.firebaseio.com/.json`;
                    context.log?.("info", `[Firebase] Testing database: ${dbUrl}`);

                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(dbUrl, {
                        method: "GET",
                        signal: controller.signal,
                    });
                    clearTimeout(timeout);

                    if (response.ok) {
                        const body = await response.text();
                        if (body !== "null" && body.length > 2) {
                            findings.push(createFinding({
                                title: "Firebase Realtime Database — Open Read Access",
                                severity: "critical",
                                category: "Cloud Misconfiguration",
                                description: `Firebase Realtime Database at ${project}.firebaseio.com is publicly readable without authentication. Data preview: ${body.substring(0, 200)}...`,
                                recommendation: "Configure Firebase Realtime Database security rules to require authentication. Set '.read' and '.write' rules to 'auth != null' at minimum. See: https://firebase.google.com/docs/database/security",
                                owasp_category: "M2: Insecure Data Storage",
                                owasp_masvs: "MSTG-STORAGE-12",
                            }, "firebase", context.scanId));
                        }
                    } else if (response.status === 401 || response.status === 403) {
                        // Database is properly secured
                        findings.push(createFinding({
                            title: "Firebase Realtime Database — Properly Secured",
                            severity: "info",
                            category: "Cloud Misconfiguration",
                            description: `Firebase database at ${project}.firebaseio.com correctly returns ${response.status} for unauthenticated requests.`,
                            recommendation: "No action needed — database access control is working.",
                            owasp_category: "M2: Insecure Data Storage",
                        }, "firebase", context.scanId));
                    }
                } catch (fetchErr) {
                    if (fetchErr.name !== "AbortError") {
                        context.log?.("warn", `[Firebase] Database check failed for ${project}: ${fetchErr.message}`);
                    }
                }

                // Test 2: Open Cloud Storage
                try {
                    const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${project}.appspot.com/o`;
                    context.log?.("info", `[Firebase] Testing storage: ${storageUrl}`);

                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(storageUrl, {
                        method: "GET",
                        signal: controller.signal,
                    });
                    clearTimeout(timeout);

                    if (response.ok) {
                        const data = await response.json();
                        if (data.items && data.items.length > 0) {
                            findings.push(createFinding({
                                title: "Firebase Cloud Storage — Open Listing Access",
                                severity: "critical",
                                category: "Cloud Misconfiguration",
                                description: `Firebase Cloud Storage at ${project}.appspot.com allows public file listing. Found ${data.items.length} files exposed publicly.`,
                                recommendation: "Configure Firebase Storage security rules to require authentication. Set 'allow read, write: if request.auth != null;'. See: https://firebase.google.com/docs/storage/security",
                                owasp_category: "M2: Insecure Data Storage",
                                owasp_masvs: "MSTG-STORAGE-12",
                            }, "firebase", context.scanId));
                        }
                    }
                } catch (fetchErr) {
                    if (fetchErr.name !== "AbortError") {
                        context.log?.("warn", `[Firebase] Storage check failed for ${project}: ${fetchErr.message}`);
                    }
                }
            }

            // Report exposed API keys
            for (const key of apiKeys) {
                findings.push(createFinding({
                    title: "Google/Firebase API Key Exposed in APK",
                    severity: "medium",
                    category: "Hardcoded Secrets",
                    description: `Google API key found in APK resources: ${key.substring(0, 10)}...${key.substring(key.length - 4)}. While Firebase API keys are designed to be in client apps, unrestricted keys can be abused for quota theft or unauthorized service access.`,
                    recommendation: "Restrict this API key in Google Cloud Console: limit to specific APIs, add Android app restrictions (package name + SHA-1), and set referrer restrictions.",
                    owasp_category: "M9: Reverse Engineering",
                    owasp_masvs: "MSTG-STORAGE-14",
                }, "firebase", context.scanId));
            }

            context.log?.("ok", `[Firebase] ${findings.length} findings (${firebaseProjects.size} projects checked)`);

            return {
                engine: "firebase",
                success: true,
                findings,
                metadata: {
                    firebaseDetected: true,
                    projectsFound: [...firebaseProjects],
                    apiKeysFound: apiKeys.size,
                },
                durationMs: Date.now() - start,
            };

        } catch (err) {
            return {
                engine: "firebase",
                success: false,
                findings: [],
                metadata: {},
                error: err.message,
                durationMs: Date.now() - start,
            };
        }
    },
};

/**
 * Extract all string values from a MobSF report for pattern matching.
 * Traverses the report recursively to find Firebase URLs and API keys.
 */
function extractStringsFromReport(report) {
    const strings = new Set();

    function walk(obj) {
        if (!obj || typeof obj !== "object") {
            if (typeof obj === "string" && obj.length > 5) strings.add(obj);
            return;
        }
        if (Array.isArray(obj)) {
            for (const item of obj) walk(item);
        } else {
            for (const value of Object.values(obj)) walk(value);
        }
    }

    walk(report);
    return strings;
}
