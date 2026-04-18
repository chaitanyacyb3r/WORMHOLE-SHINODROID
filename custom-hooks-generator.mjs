/**
 * Shinodroid — Template-Based Custom Frida Hook Generator
 *
 * Generates app-specific Frida scripts from MobSF static analysis data.
 *
 * Strategy (zero AI cost):
 *   1. Extract class names + method patterns from MobSF code_analysis
 *   2. Categorize by security domain (auth, crypto, storage, network, payment)
 *   3. Apply pre-written hook templates for each category
 *   4. Output .js files ready for Frida injection
 *
 * Cost: $0.00 — pure regex + templates.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Security-Relevant Method Patterns ───────────────────────────────────────

const SECURITY_PATTERNS = {
    auth: {
        methods: /login|signin|signIn|authenticate|verify|validate|authorize|checkPassword|isLoggedIn|getToken|refreshToken|logout|isAuthenticated|checkSession|verifyOtp|verifyPin/i,
        label: "Authentication",
        masvs: "MSTG-AUTH",
    },
    crypto: {
        methods: /encrypt|decrypt|hash|sign|cipher|aes|rsa|hmac|digest|secretKey|generateKey|deriveKey|pbkdf|md5|sha1|sha256|base64|encode|decode/i,
        label: "Cryptography",
        masvs: "MSTG-CRYPTO",
    },
    storage: {
        methods: /saveToken|storeCredential|putString|cacheData|writeFile|insertRecord|savePreference|setSharedPref|writeToDb|storeSession|cacheToken|persistData|saveUser/i,
        label: "Data Storage",
        masvs: "MSTG-STORAGE",
    },
    network: {
        methods: /makeRequest|callApi|httpPost|httpGet|sendData|uploadFile|downloadUrl|fetchData|postJson|apiCall|sendRequest|executeRequest|getResponse|submitForm/i,
        label: "Network",
        masvs: "MSTG-NETWORK",
    },
    payment: {
        methods: /processPayment|checkOut|purchas|transact|billing|subscribe|charge|refund|addToCart|placeOrder|initPayment|verifyPayment|getBalance|transferFund/i,
        label: "Payment/Transaction",
        masvs: "MSTG-ARCH",
    },
};

// ── Frida Hook Template ─────────────────────────────────────────────────────

/**
 * Generate a Frida hook for a specific class and its matched methods.
 *
 * The generated hook:
 *   - Hooks all overloads of each method
 *   - Logs input parameters (truncated for safety)
 *   - Logs return value
 *   - Flags sensitive patterns (passwords, tokens, keys)
 *   - Does NOT modify behavior (observation only)
 */
function generateHookCode(className, methods, category) {
    const hooks = methods.map(method => `
    // Hook: ${className}.${method.name}() — ${category.label}
    try {
        var cls_${sanitizeVar(method.name)} = Java.use('${className}');
        var overloads_${sanitizeVar(method.name)} = cls_${sanitizeVar(method.name)}.${method.name}.overloads;
        for (var i = 0; i < overloads_${sanitizeVar(method.name)}.length; i++) {
            (function(overload, idx) {
                overload.implementation = function() {
                    var args = [];
                    for (var j = 0; j < arguments.length; j++) {
                        try {
                            var val = arguments[j] ? arguments[j].toString() : 'null';
                            if (val.length > 200) val = val.substring(0, 200) + '...';
                            args.push(val);
                            // Flag sensitive values
                            if (/password|secret|key|token|bearer|api.?key/i.test(val)) {
                                console.log('[!] [CUSTOM-${category.label.toUpperCase()}] 🚨 SENSITIVE VALUE in arg[' + j + ']: ' + val.substring(0, 50) + '...');
                            }
                        } catch(e) {
                            args.push('<unparseable>');
                        }
                    }
                    console.log('[+] [CUSTOM-${category.label.toUpperCase()}] ${className.split('.').pop()}.${method.name}(' + args.join(', ') + ')');
                    var ret = this.${method.name}.apply(this, arguments);
                    try {
                        var retStr = ret ? ret.toString() : 'null';
                        if (retStr.length > 200) retStr = retStr.substring(0, 200) + '...';
                        console.log('[+] [CUSTOM-${category.label.toUpperCase()}] => ' + retStr);
                        // Flag boolean returns (potential bypass points)
                        if (typeof ret === 'boolean' || retStr === 'true' || retStr === 'false') {
                            console.log('[!] [CUSTOM-${category.label.toUpperCase()}] Boolean return from ${method.name}() = ' + retStr + ' (potential bypass point)');
                        }
                    } catch(e) {}
                    return ret;
                };
            })(overloads_${sanitizeVar(method.name)}[i], i);
        }
        console.log('[*] [CUSTOM] Hooked ${className}.${method.name} (${category.label})');
    } catch(e) {
        // Class or method not loaded yet — this is normal
    }`).join("\n");

    return `// ================================================================
// CUSTOM HOOK: ${className.split('.').pop()}
// Category: ${category.label} (${category.masvs})
// Generated by Shinodroid Custom Hook Generator
// ================================================================

setTimeout(function() {
    Java.perform(function() {
        console.log('');
        console.log('================================================================');
        console.log('[#]  CUSTOM HOOK — ${className.split('.').pop()} (${category.label})');
        console.log('================================================================');
${hooks}
    });
}, 2000);
`;
}

// ── Class Extraction from MobSF ─────────────────────────────────────────────

/**
 * Extract security-relevant classes from MobSF report.
 *
 * Sources:
 *   1. code_analysis findings (classes flagged by MobSF)
 *   2. browsable_activities (deep link handlers)
 *   3. exported_activities/providers/receivers
 *
 * @param {object} mobsfReport  MobSF JSON report
 * @param {string} packageName  App package name
 * @returns {Array<{className, category, methods, severity}>}
 */
export function extractTargetClasses(mobsfReport, packageName) {
    const targets = new Map(); // className → { className, categories, severity }

    if (!mobsfReport) return [];

    // ── From code_analysis findings ──────────────────────────────────────
    if (mobsfReport.code_analysis) {
        for (const [id, finding] of Object.entries(mobsfReport.code_analysis)) {
            const filePath = finding.metadata?.file_path || finding.path || "";
            if (!filePath) continue;

            // Convert file path to Java class name
            // "com/example/app/auth/LoginManager.java" → "com.example.app.auth.LoginManager"
            let className = filePath
                .replace(/\.java$/i, "")
                .replace(/\\/g, "/")
                .replace(/\//g, ".");

            // Remove leading source path prefixes
            const pkgStart = className.indexOf(packageName);
            if (pkgStart > 0) className = className.substring(pkgStart);

            if (!className.includes(".")) continue; // not a valid class name
            if (className.includes("BuildConfig") || className.includes("R$")) continue; // skip generated

            const existing = targets.get(className) || {
                className,
                categories: new Set(),
                severity: finding.severity || "info",
                matchedMethods: [],
            };

            // Categorize based on class name and finding description
            for (const [cat, pattern] of Object.entries(SECURITY_PATTERNS)) {
                const combined = className + " " + (finding.description || "") + " " + (finding.title || "");
                if (pattern.methods.test(combined)) {
                    existing.categories.add(cat);
                }
            }

            // If no specific category matched, try to categorize by class name alone
            if (existing.categories.size === 0) {
                const lowerName = className.toLowerCase();
                if (lowerName.includes("login") || lowerName.includes("auth") || lowerName.includes("session")) {
                    existing.categories.add("auth");
                } else if (lowerName.includes("crypto") || lowerName.includes("cipher") || lowerName.includes("encrypt")) {
                    existing.categories.add("crypto");
                } else if (lowerName.includes("storage") || lowerName.includes("database") || lowerName.includes("cache")) {
                    existing.categories.add("storage");
                } else if (lowerName.includes("network") || lowerName.includes("http") || lowerName.includes("api")) {
                    existing.categories.add("network");
                } else if (lowerName.includes("payment") || lowerName.includes("billing") || lowerName.includes("wallet")) {
                    existing.categories.add("payment");
                }
            }

            if (existing.categories.size > 0) {
                targets.set(className, existing);
            }
        }
    }

    // ── From exported components ─────────────────────────────────────────
    const exportedComponents = [
        ...(mobsfReport.exported_activities || []),
        ...(mobsfReport.exported_providers || []),
        ...(mobsfReport.exported_receivers || []),
    ];

    for (const component of exportedComponents) {
        const className = typeof component === "string" ? component : component.name || "";
        if (!className || !className.includes(".")) continue;

        const existing = targets.get(className) || {
            className,
            categories: new Set(),
            severity: "medium",
            matchedMethods: [],
        };

        // Exported components are platform-security relevant
        existing.categories.add("auth");
        targets.set(className, existing);
    }

    // ── Sort by severity and limit ──────────────────────────────────────
    const severityOrder = { critical: 5, high: 4, danger: 4, warning: 3, medium: 3, low: 2, info: 1 };

    return [...targets.values()]
        .filter(t => t.categories.size > 0)
        .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
        .slice(0, 15) // Top 15 most critical classes
        .map(t => ({
            className: t.className,
            categories: [...t.categories],
            severity: t.severity,
        }));
}

// ── Hook File Generation ────────────────────────────────────────────────────

/**
 * Generate custom Frida hook files from MobSF report.
 *
 * @param {object} mobsfReport   MobSF JSON report
 * @param {string} outDir       Directory to write generated scripts
 * @param {string} packageName  App package name (optional, extracted from report)
 * @returns {Array<{name, file}>}  Scripts ready for the dynamic-analyzer scripts array
 */
export async function generateCustomHooks(mobsfReport, outDir, packageName) {
    if (!mobsfReport) return [];

    const pkg = packageName || mobsfReport.package_name || "";
    const targetClasses = extractTargetClasses(mobsfReport, pkg);

    if (targetClasses.length === 0) return [];

    const generatedScripts = [];

    for (const target of targetClasses) {
        const primaryCategory = target.categories[0];
        const pattern = SECURITY_PATTERNS[primaryCategory];
        if (!pattern) continue;

        // Find method names by extracting words that match the pattern from the class name
        // Since we don't have the actual source code, we hook common method patterns
        const commonMethods = getCommonMethods(primaryCategory);

        const hookCode = generateHookCode(target.className, commonMethods, pattern);
        const safeName = target.className.split(".").pop();
        const fileName = `CUSTOM-${safeName}.js`;
        const filePath = join(outDir, fileName);

        try {
            await writeFile(filePath, hookCode, "utf-8");
            generatedScripts.push({
                name: `Custom: ${safeName} (${pattern.label})`,
                file: filePath,
            });
        } catch (err) {
            // non-critical, continue with other classes
        }
    }

    return generatedScripts;
}

// ── Common Methods per Category ─────────────────────────────────────────────

function getCommonMethods(category) {
    const methods = {
        auth: [
            { name: "login" }, { name: "signIn" }, { name: "authenticate" },
            { name: "validateCredentials" }, { name: "checkPassword" },
            { name: "isLoggedIn" }, { name: "getToken" }, { name: "refreshToken" },
            { name: "logout" }, { name: "isAuthenticated" }, { name: "getAccessToken" },
            { name: "verifyOtp" }, { name: "verifyPin" }, { name: "checkSession" },
            { name: "validateToken" }, { name: "signUp" }, { name: "register" },
        ],
        crypto: [
            { name: "encrypt" }, { name: "decrypt" }, { name: "hash" },
            { name: "sign" }, { name: "verify" }, { name: "generateKey" },
            { name: "deriveKey" }, { name: "encode" }, { name: "decode" },
            { name: "getSecretKey" }, { name: "initCipher" },
        ],
        storage: [
            { name: "save" }, { name: "store" }, { name: "put" },
            { name: "write" }, { name: "insert" }, { name: "cache" },
            { name: "persist" }, { name: "get" }, { name: "read" },
            { name: "load" }, { name: "fetch" }, { name: "delete" },
        ],
        network: [
            { name: "makeRequest" }, { name: "callApi" }, { name: "post" },
            { name: "get" }, { name: "sendRequest" }, { name: "executeRequest" },
            { name: "fetchData" }, { name: "uploadFile" }, { name: "downloadFile" },
            { name: "getResponse" }, { name: "submitForm" }, { name: "send" },
        ],
        payment: [
            { name: "processPayment" }, { name: "pay" }, { name: "charge" },
            { name: "checkout" }, { name: "purchase" }, { name: "subscribe" },
            { name: "getBalance" }, { name: "transfer" }, { name: "refund" },
            { name: "initPayment" }, { name: "verifyPayment" },
        ],
    };

    return methods[category] || [];
}

// ── Utilities ───────────────────────────────────────────────────────────────

function sanitizeVar(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
}
