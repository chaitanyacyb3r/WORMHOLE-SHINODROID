/**
 * Shinodroid — Compliance Mapper
 * 
 * Maps security findings to compliance frameworks:
 *   - OWASP MASVS v2.0 (Mobile Application Security Verification Standard)
 *   - OWASP Mobile Top 10 (2024)
 *   - GDPR (General Data Protection Regulation)
 *   - DPDPA 2023 (India's Digital Personal Data Protection Act)
 *   - PCI-DSS v4.0 (Payment Card Industry Data Security Standard)
 *   - HIPAA (Health Insurance Portability and Accountability Act)
 * 
 * IMPORTANT: MASVS v2.0 control IDs and categories are sourced from:
 *   https://mas.owasp.org/MASVS/
 * 
 * The mapping uses keyword matching on finding title, category, description,
 * and existing owasp_category fields to assign compliance tags.
 */

import { Logger } from "./logger.mjs";

// ═══════════════════════════════════════════════════════════════════════════════
// OWASP MASVS v2.0 Control Groups (from https://mas.owasp.org/MASVS/)
// ═══════════════════════════════════════════════════════════════════════════════

const MASVS_CONTROLS = {
    "MASVS-STORAGE-1": "The app securely stores sensitive data.",
    "MASVS-STORAGE-2": "The app prevents leakage of sensitive data.",
    "MASVS-CRYPTO-1":  "The app employs current strong cryptography and uses it according to industry best practices.",
    "MASVS-CRYPTO-2":  "The app performs key management according to industry best practices.",
    "MASVS-AUTH-1":    "The app uses secure authentication and authorization protocols and follows the relevant best practices.",
    "MASVS-AUTH-2":    "The app performs local authentication securely according to the platform best practices.",
    "MASVS-AUTH-3":    "The app secures sensitive operations with additional authentication.",
    "MASVS-NETWORK-1": "The app secures all network traffic according to the current best practices.",
    "MASVS-NETWORK-2": "The app performs identity pinning for all remote endpoints under the developer's control.",
    "MASVS-PLATFORM-1":"The app uses IPC mechanisms securely.",
    "MASVS-PLATFORM-2":"The app uses WebViews securely.",
    "MASVS-PLATFORM-3":"The app uses the user interface securely.",
    "MASVS-CODE-1":    "The app requires an up-to-date platform version.",
    "MASVS-CODE-2":    "The app has a mechanism for enforcing app updates.",
    "MASVS-CODE-3":    "The app only uses software components without known vulnerabilities.",
    "MASVS-CODE-4":    "The app validates and sanitizes all untrusted inputs.",
    "MASVS-RESILIENCE-1":"The app validates the integrity of the platform.",
    "MASVS-RESILIENCE-2":"The app implements anti-tampering mechanisms.",
    "MASVS-RESILIENCE-3":"The app implements anti-static analysis mechanisms.",
    "MASVS-RESILIENCE-4":"The app implements anti-dynamic analysis mechanisms.",
    "MASVS-PRIVACY-1": "The app minimizes access to sensitive data and resources.",
    "MASVS-PRIVACY-2": "The app prevents identification of the user.",
    "MASVS-PRIVACY-3": "The app is transparent about data collection and usage.",
    "MASVS-PRIVACY-4": "The app offers user control over their data.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Keyword → Compliance Rule Mapping
//
// Each rule maps a set of keywords (matched against title + category + 
// description) to one or more compliance framework references.
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLIANCE_RULES = [
    // ── Storage & Data Leakage ──────────────────────────────────────────────
    {
        keywords: ["shared.?pref", "sqlite", "database", "storage", "file.*permission", "world.*read", "world.*writ", "external.*storage", "sdcard", "cleartext.*storage", "plaintext.*storage", "insecure.*storage", "data.*leak", "log.*leak", "logcat.*leak"],
        masvs: ["MASVS-STORAGE-1"],
        mobile_top10: "M9: Insecure Data Storage",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 3.4 — Render PAN unreadable",
        hipaa: "§164.312(a)(1) — Access Control",
    },
    {
        keywords: ["clipboard", "copy.*paste", "screenshot", "screen.*capture", "backup", "allowbackup", "debuggable"],
        masvs: ["MASVS-STORAGE-2"],
        mobile_top10: "M9: Insecure Data Storage",
        gdpr: "Art. 25 — Data Protection by Design",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: null,
        hipaa: "§164.312(c)(1) — Integrity",
    },
    // ── Cryptography ────────────────────────────────────────────────────────
    {
        keywords: ["weak.*crypt", "weak.*cipher", "des", "md5", "sha1", "ecb.*mode", "hardcoded.*key", "hardcoded.*secret", "hardcoded.*password", "hardcoded.*iv", "static.*key", "embedded.*key", "insecure.*random", "predictable.*random", "math\\.random"],
        masvs: ["MASVS-CRYPTO-1"],
        mobile_top10: "M10: Insufficient Cryptography",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 3.5 — Protect stored account data keys",
        hipaa: "§164.312(a)(2)(iv) — Encryption and Decryption",
    },
    {
        keywords: ["key.*management", "key.*storage", "keystore", "key.*rotation", "key.*derivation"],
        masvs: ["MASVS-CRYPTO-2"],
        mobile_top10: "M10: Insufficient Cryptography",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 3.6 — Cryptographic key management",
        hipaa: "§164.312(a)(2)(iv) — Encryption and Decryption",
    },
    // ── Authentication & Authorization ──────────────────────────────────────
    {
        keywords: ["auth", "login", "session", "token.*expir", "jwt", "oauth", "credential", "password.*policy", "brute.*force", "account.*lockout"],
        masvs: ["MASVS-AUTH-1"],
        mobile_top10: "M3: Insecure Authentication/Authorization",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 8.3 — Establish and manage identity authentication",
        hipaa: "§164.312(d) — Person or Entity Authentication",
    },
    {
        keywords: ["biometric", "fingerprint", "face.*id", "local.*auth", "pin", "pattern.*lock"],
        masvs: ["MASVS-AUTH-2"],
        mobile_top10: "M3: Insecure Authentication/Authorization",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: "§164.312(d) — Person or Entity Authentication",
    },
    // ── Network Communication ───────────────────────────────────────────────
    {
        keywords: ["ssl", "tls", "http(?!s)", "cleartext.*traffic", "network.*security.*config", "insecure.*connection", "man.?in.?the.?middle", "mitm", "certificate.*valid", "mixed.*content"],
        masvs: ["MASVS-NETWORK-1"],
        mobile_top10: "M5: Insecure Communication",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 4.2 — Protect cardholder data with strong cryptography during transmission",
        hipaa: "§164.312(e)(1) — Transmission Security",
    },
    {
        keywords: ["cert.*pin", "ssl.*pin", "public.*key.*pin", "certificate.*transparency"],
        masvs: ["MASVS-NETWORK-2"],
        mobile_top10: "M5: Insecure Communication",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 4.2 — Protect cardholder data with strong cryptography during transmission",
        hipaa: "§164.312(e)(1) — Transmission Security",
    },
    // ── Platform Interaction ────────────────────────────────────────────────
    {
        keywords: ["exported.*activity", "exported.*service", "exported.*receiver", "exported.*provider", "content.*provider", "intent.*filter", "deep.*link", "broadcast", "ipc", "pending.*intent", "implicit.*intent"],
        masvs: ["MASVS-PLATFORM-1"],
        mobile_top10: "M1: Improper Platform Usage",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 6.2 — Bespoke and custom software is developed securely",
        hipaa: null,
    },
    {
        keywords: ["webview", "javascript.*interface", "addjavascript", "loadurl", "evaluatejavascript", "file.*access", "setallowfile"],
        masvs: ["MASVS-PLATFORM-2"],
        mobile_top10: "M1: Improper Platform Usage",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 6.2 — Bespoke and custom software is developed securely",
        hipaa: null,
    },
    {
        keywords: ["tapjacking", "overlay", "flag.*secure", "screen.*overlay"],
        masvs: ["MASVS-PLATFORM-3"],
        mobile_top10: "M1: Improper Platform Usage",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: null,
    },
    // ── Code Quality ────────────────────────────────────────────────────────
    {
        keywords: ["min.*sdk", "target.*sdk", "api.*level", "outdated.*sdk", "deprecated.*api"],
        masvs: ["MASVS-CODE-1"],
        mobile_top10: "M2: Insecure Supply Chain",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 6.3 — Security vulnerabilities are identified and addressed",
        hipaa: null,
    },
    {
        keywords: ["vulnerable.*librar", "vulnerable.*depend", "cve-", "known.*vulnerabilit", "outdated.*component", "supply.*chain"],
        masvs: ["MASVS-CODE-3"],
        mobile_top10: "M2: Insecure Supply Chain",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 6.3 — Security vulnerabilities are identified and addressed",
        hipaa: null,
    },
    {
        keywords: ["inject", "sql.*inject", "xss", "cross.?site", "input.*valid", "unsanitized", "format.*string"],
        masvs: ["MASVS-CODE-4"],
        mobile_top10: "M4: Insufficient Input/Output Validation",
        gdpr: null,
        dpdpa: null,
        pci_dss: "Req. 6.2 — Bespoke and custom software is developed securely",
        hipaa: null,
    },
    // ── Resilience ──────────────────────────────────────────────────────────
    {
        keywords: ["root.*detect", "jailbreak", "emulator.*detect", "integrity.*check", "safetynet", "play.*integrity"],
        masvs: ["MASVS-RESILIENCE-1"],
        mobile_top10: "M8: Security Misconfiguration",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: null,
    },
    {
        keywords: ["tamper", "code.*sign", "apk.*sign", "signature.*verif", "code.*integrity"],
        masvs: ["MASVS-RESILIENCE-2"],
        mobile_top10: "M8: Security Misconfiguration",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: null,
    },
    {
        keywords: ["obfuscat", "proguard", "r8", "decompil", "reverse.*engineer", "string.*encrypt"],
        masvs: ["MASVS-RESILIENCE-3"],
        mobile_top10: "M7: Insufficient Binary Protections",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: null,
    },
    {
        keywords: ["frida.*detect", "hook.*detect", "anti.?debug", "debug.*detect", "ptrace", "dynamic.*instrument"],
        masvs: ["MASVS-RESILIENCE-4"],
        mobile_top10: "M7: Insufficient Binary Protections",
        gdpr: null,
        dpdpa: null,
        pci_dss: null,
        hipaa: null,
    },
    // ── Privacy ─────────────────────────────────────────────────────────────
    {
        keywords: ["permission", "dangerous.*permission", "camera", "microphone", "location", "contacts", "sms", "phone.*state", "calendar"],
        masvs: ["MASVS-PRIVACY-1"],
        mobile_top10: "M1: Improper Platform Usage",
        gdpr: "Art. 5(1)(c) — Data Minimisation",
        dpdpa: "§8(3) — Collection limited to purpose",
        pci_dss: null,
        hipaa: "§164.514 — Minimum Necessary",
    },
    {
        keywords: ["tracking", "fingerprint.*device", "device.*id", "advertising.*id", "imei", "mac.*address", "analytics"],
        masvs: ["MASVS-PRIVACY-2"],
        mobile_top10: "M6: Inadequate Privacy Controls",
        gdpr: "Art. 5(1)(c) — Data Minimisation",
        dpdpa: "§8(3) — Collection limited to purpose",
        pci_dss: null,
        hipaa: null,
    },
    {
        keywords: ["privacy.*policy", "consent", "data.*collect", "third.?party.*sdk", "tracker"],
        masvs: ["MASVS-PRIVACY-3"],
        mobile_top10: "M6: Inadequate Privacy Controls",
        gdpr: "Art. 13 — Information to be provided (transparency)",
        dpdpa: "§6 — Notice to Data Principal",
        pci_dss: null,
        hipaa: null,
    },
    // ── Firebase / Cloud Misconfig ───────────────────────────────────────────
    {
        keywords: ["firebase", "firestore", "realtime.*database", "cloud.*storage", "misconfigur", "open.*bucket", "unauthenticated.*access"],
        masvs: ["MASVS-STORAGE-1", "MASVS-AUTH-1"],
        mobile_top10: "M8: Security Misconfiguration",
        gdpr: "Art. 32 — Security of Processing",
        dpdpa: "§8(7) — Reasonable security safeguards",
        pci_dss: "Req. 2.2 — System components are configured and managed securely",
        hipaa: "§164.312(a)(1) — Access Control",
    },
];


// ═══════════════════════════════════════════════════════════════════════════════
// Compliance Mapper Class
// ═══════════════════════════════════════════════════════════════════════════════

export class ComplianceMapper {

    /**
     * Maps a single finding to all applicable compliance frameworks.
     * Returns an object with the compliance tags.
     * 
     * @param {Object} finding — A standard Shinodroid finding
     * @returns {Object} compliance — { masvs: [...], mobile_top10: "...", gdpr: "...", dpdpa: "...", pci_dss: "...", hipaa: "..." }
     */
    static mapFinding(finding) {
        const text = [
            finding.title || "",
            finding.category || "",
            finding.description || "",
            finding.owasp_category || "",
        ].join(" ").toLowerCase();

        const result = {
            masvs: [],
            mobile_top10: null,
            gdpr: null,
            dpdpa: null,
            pci_dss: null,
            hipaa: null,
        };

        const seenMasvs = new Set();

        for (const rule of COMPLIANCE_RULES) {
            const matched = rule.keywords.some(kw => {
                try {
                    return new RegExp(kw, "i").test(text);
                } catch {
                    return text.includes(kw.toLowerCase());
                }
            });

            if (matched) {
                // Collect MASVS controls (deduplicated)
                for (const m of rule.masvs) {
                    if (!seenMasvs.has(m)) {
                        seenMasvs.add(m);
                        result.masvs.push({
                            id: m,
                            description: MASVS_CONTROLS[m] || m,
                        });
                    }
                }
                // Take first match for each framework (most specific)
                if (!result.mobile_top10 && rule.mobile_top10) result.mobile_top10 = rule.mobile_top10;
                if (!result.gdpr && rule.gdpr) result.gdpr = rule.gdpr;
                if (!result.dpdpa && rule.dpdpa) result.dpdpa = rule.dpdpa;
                if (!result.pci_dss && rule.pci_dss) result.pci_dss = rule.pci_dss;
                if (!result.hipaa && rule.hipaa) result.hipaa = rule.hipaa;
            }
        }

        return result;
    }

    /**
     * Enrich an array of findings with compliance tags.
     * Adds a `compliance` property to each finding object.
     * 
     * @param {Array} findings
     * @returns {Array} — Same array, mutated with .compliance property
     */
    static enrichFindings(findings) {
        if (!findings || !Array.isArray(findings)) return findings;

        let mapped = 0;
        for (const f of findings) {
            f.compliance = ComplianceMapper.mapFinding(f);
            if (f.compliance.masvs.length > 0) mapped++;
        }

        Logger.info(`[Compliance] Mapped ${mapped}/${findings.length} findings to OWASP MASVS v2.0 controls.`);
        return findings;
    }

    /**
     * Generate a compliance summary across all findings.
     * Returns an object showing pass/fail status for each MASVS control group.
     * 
     * @param {Array} findings — Enriched findings (with .compliance property)
     * @returns {Object} summary
     */
    static generateSummary(findings) {
        if (!findings || !Array.isArray(findings)) return {};

        // Group MASVS controls by category
        const categories = {
            "MASVS-STORAGE":    { name: "Storage",        controls: {}, violations: 0 },
            "MASVS-CRYPTO":     { name: "Cryptography",   controls: {}, violations: 0 },
            "MASVS-AUTH":       { name: "Authentication",  controls: {}, violations: 0 },
            "MASVS-NETWORK":    { name: "Network",         controls: {}, violations: 0 },
            "MASVS-PLATFORM":   { name: "Platform",        controls: {}, violations: 0 },
            "MASVS-CODE":       { name: "Code Quality",    controls: {}, violations: 0 },
            "MASVS-RESILIENCE": { name: "Resilience",      controls: {}, violations: 0 },
            "MASVS-PRIVACY":    { name: "Privacy",         controls: {}, violations: 0 },
        };

        // Initialize all controls as "PASS"
        for (const [id, desc] of Object.entries(MASVS_CONTROLS)) {
            const catKey = id.replace(/-\d+$/, "");
            if (categories[catKey]) {
                categories[catKey].controls[id] = {
                    description: desc,
                    status: "PASS",
                    violatingFindings: [],
                };
            }
        }

        // Mark controls as FAIL if any finding maps to them
        for (const f of findings) {
            if (!f.compliance?.masvs) continue;
            for (const m of f.compliance.masvs) {
                const catKey = m.id.replace(/-\d+$/, "");
                if (categories[catKey]?.controls[m.id]) {
                    categories[catKey].controls[m.id].status = "FAIL";
                    categories[catKey].controls[m.id].violatingFindings.push(f.title);
                    categories[catKey].violations++;
                }
            }
        }

        // Framework counts
        const frameworkCounts = { gdpr: 0, dpdpa: 0, pci_dss: 0, hipaa: 0, mobile_top10: new Set() };
        for (const f of findings) {
            if (!f.compliance) continue;
            if (f.compliance.gdpr) frameworkCounts.gdpr++;
            if (f.compliance.dpdpa) frameworkCounts.dpdpa++;
            if (f.compliance.pci_dss) frameworkCounts.pci_dss++;
            if (f.compliance.hipaa) frameworkCounts.hipaa++;
            if (f.compliance.mobile_top10) frameworkCounts.mobile_top10.add(f.compliance.mobile_top10);
        }

        return {
            masvs: categories,
            frameworkCounts: {
                gdpr: frameworkCounts.gdpr,
                dpdpa: frameworkCounts.dpdpa,
                pci_dss: frameworkCounts.pci_dss,
                hipaa: frameworkCounts.hipaa,
                mobile_top10_categories: frameworkCounts.mobile_top10.size,
            },
        };
    }

    /**
     * Build a Markdown compliance section for the AI report.
     * This is programmatically generated (not LLM), ensuring accuracy.
     * 
     * @param {Array} findings — Enriched findings
     * @returns {string} Markdown text
     */
    static buildComplianceMarkdown(findings) {
        const summary = ComplianceMapper.generateSummary(findings);
        const lines = [];

        lines.push("## 📋 Compliance Mapping");
        lines.push("");
        lines.push("> This section maps all findings to industry compliance frameworks.");
        lines.push("> Mappings are generated programmatically based on OWASP MASVS v2.0 (https://mas.owasp.org/MASVS/).");
        lines.push("");

        // ── MASVS Checklist Table ────────────────────────────────────────────
        lines.push("### OWASP MASVS v2.0 Compliance Checklist");
        lines.push("");
        lines.push("| Control | Description | Status | Violations |");
        lines.push("|---------|-------------|--------|------------|");

        for (const [catKey, cat] of Object.entries(summary.masvs)) {
            // Category header row
            lines.push(`| **${catKey}** | **${cat.name}** | | |`);
            for (const [ctrlId, ctrl] of Object.entries(cat.controls)) {
                const icon = ctrl.status === "PASS" ? "✅" : "❌";
                const violations = ctrl.violatingFindings.length > 0
                    ? ctrl.violatingFindings.slice(0, 2).join(", ").substring(0, 60)
                    : "—";
                lines.push(`| ${ctrlId} | ${ctrl.description.substring(0, 70)} | ${icon} ${ctrl.status} | ${violations} |`);
            }
        }
        lines.push("");

        // ── Framework Impact Summary ─────────────────────────────────────────
        lines.push("### Cross-Framework Impact Summary");
        lines.push("");
        lines.push("| Framework | Affected Findings | Status |");
        lines.push("|-----------|------------------|--------|");

        const fc = summary.frameworkCounts;
        lines.push(`| OWASP Mobile Top 10 (2024) | ${fc.mobile_top10_categories} categories affected | ${fc.mobile_top10_categories > 0 ? "⚠️ Review Required" : "✅ Clear"} |`);
        lines.push(`| GDPR (EU) | ${fc.gdpr} findings with GDPR implications | ${fc.gdpr > 0 ? "⚠️ Review Required" : "✅ Clear"} |`);
        lines.push(`| DPDPA 2023 (India) | ${fc.dpdpa} findings with DPDPA implications | ${fc.dpdpa > 0 ? "⚠️ Review Required" : "✅ Clear"} |`);
        lines.push(`| PCI-DSS v4.0 | ${fc.pci_dss} findings with PCI implications | ${fc.pci_dss > 0 ? "⚠️ Review Required" : "✅ Clear"} |`);
        lines.push(`| HIPAA | ${fc.hipaa} findings with HIPAA implications | ${fc.hipaa > 0 ? "⚠️ Review Required" : "✅ Clear"} |`);
        lines.push("");

        // ── Per-Finding Compliance Detail ─────────────────────────────────────
        const complianceFindings = findings.filter(f => f.compliance?.masvs?.length > 0);
        if (complianceFindings.length > 0) {
            lines.push("### Per-Finding Compliance Detail");
            lines.push("");
            lines.push("| # | Finding | Severity | MASVS | Mobile Top 10 | GDPR | DPDPA | PCI-DSS |");
            lines.push("|---|---------|----------|-------|---------------|------|-------|---------|");
            complianceFindings.forEach((f, i) => {
                const masvs = f.compliance.masvs.map(m => m.id).join(", ");
                const top10 = f.compliance.mobile_top10 || "—";
                const gdpr = f.compliance.gdpr ? f.compliance.gdpr.split("—")[0].trim() : "—";
                const dpdpa = f.compliance.dpdpa ? f.compliance.dpdpa.split("—")[0].trim() : "—";
                const pci = f.compliance.pci_dss ? f.compliance.pci_dss.split("—")[0].trim() : "—";
                lines.push(`| ${i + 1} | ${f.title.substring(0, 40)} | ${f.severity} | ${masvs} | ${top10.substring(0, 25)} | ${gdpr} | ${dpdpa} | ${pci} |`);
            });
            lines.push("");
        }

        return lines.join("\n");
    }
}
