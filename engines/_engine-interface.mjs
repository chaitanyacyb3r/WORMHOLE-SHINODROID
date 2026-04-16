/**
 * Shinodroid Engine Interface — Standard Contract
 * 
 * Every engine file (*.engine.mjs) MUST export a default object matching this interface.
 * The orchestrator auto-discovers engines by scanning the engines/ directory.
 * 
 * ─── ADDING A NEW TOOL ────────────────────────────────────────────────────
 * 1. Create engines/your-tool.engine.mjs
 * 2. Export default { name, type, version, isAvailable(), run() }
 * 3. Done. The orchestrator discovers it automatically.
 * 
 * ─── REMOVING A TOOL ──────────────────────────────────────────────────────
 * 1. Delete engines/your-tool.engine.mjs
 * 2. Done. The orchestrator stops looking for it.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ── Finding Schema ────────────────────────────────────────────────────────
/**
 * @typedef {Object} Finding
 * @property {string} title           - "SSL Certificate Pinning Bypassed"
 * @property {string} severity        - "critical" | "high" | "medium" | "low" | "info"
 * @property {number} severity_order  - 5 (critical) → 1 (info)
 * @property {string} category        - "SSL Pinning" | "Static Analysis" etc.
 * @property {string} description     - Evidence / observed behavior
 * @property {string} recommendation  - How to fix
 * @property {string|null} owasp_category    - "M3: Insecure Communication"
 * @property {string|null} owasp_masvs       - "MSTG-NETWORK-1" (optional MASVS test ID)
 * @property {number|null} cvss_score        - CVSS score if available
 * @property {string}      engine            - "frida" | "mobsf" | "androwarn" etc.
 * @property {string|null} scan_id           - Supabase scan ID for linking
 */

// ── Engine Result Schema ──────────────────────────────────────────────────
/**
 * @typedef {Object} EngineResult
 * @property {string}    engine     - Engine identifier (e.g., "mobsf", "frida")
 * @property {boolean}   success    - Did it run without fatal errors?
 * @property {Finding[]} findings   - Array of standardized findings
 * @property {Object}    metadata   - Engine-specific data (counters, raw output, etc.)
 * @property {string}    [error]    - Error message if success=false
 * @property {boolean}   [skipped]  - True if engine was available but couldn't run (e.g., no emulator)
 * @property {number}    durationMs - How long the engine took (milliseconds)
 */

// ── Engine Context Schema ─────────────────────────────────────────────────
/**
 * @typedef {Object} EngineContext
 * @property {string}        scanId          - Supabase scan ID
 * @property {string}        outDir          - Directory for output files
 * @property {string}        fileName        - Original APK filename
 * @property {Object|null}   mobsfReport     - MobSF JSON report (available after mobsf engine runs)
 * @property {string|null}   packageName     - Android package name (extracted by mobsf or frida)
 * @property {Finding[]}     allFindings     - All findings so far (for AI triage engine)
 * @property {string[]}      endpoints       - API endpoints discovered (for network engines)
 * @property {Function|null} log             - Logging function: (level, message) => void
 * @property {Function|null} onProgress      - Progress callback: (message) => void
 */

// ── Engine Types ──────────────────────────────────────────────────────────
/**
 * Engine types determine execution order:
 *   1. "static"  — Run first, in parallel (no emulator needed)
 *   2. "dynamic" — Run second, sequentially (share emulator)
 *   3. "network" — Run third (use discovered endpoints from dynamic phase)
 *   4. "sca"     — Run in parallel (dependency/SBOM analysis)
 *   5. "ai"      — Run last (needs all findings from all other engines)
 */

// ── Severity Helpers ──────────────────────────────────────────────────────

/**
 * Normalize any severity string to one of the 5 standard levels.
 * @param {string} sev - Raw severity string from any tool
 * @returns {"critical"|"high"|"medium"|"low"|"info"}
 */
export function normalizeSeverity(sev) {
    const s = String(sev || "info").toLowerCase().trim();
    if (s === "critical" || s === "danger" || s === "severe") return "critical";
    if (s === "high" || s === "warning") return "high";
    if (s === "medium" || s === "moderate") return "medium";
    if (s === "low" || s === "minor") return "low";
    return "info";
}

/**
 * Get sort-order number for a severity (higher = worse).
 * @param {"critical"|"high"|"medium"|"low"|"info"} sev
 * @returns {number}
 */
export function getSeverityOrder(sev) {
    return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[sev] || 0;
}

/**
 * Create a standardized Finding object.
 * Ensures all required fields are present with safe defaults.
 * 
 * @param {Partial<Finding>} fields
 * @param {string} engineName
 * @param {string|null} scanId
 * @returns {Finding}
 */
export function createFinding(fields, engineName, scanId) {
    const severity = normalizeSeverity(fields.severity);
    return {
        scan_id: scanId || fields.scan_id || null,
        title: fields.title || "Untitled Finding",
        severity,
        severity_order: getSeverityOrder(severity),
        category: fields.category || "General",
        description: fields.description || "No description provided",
        recommendation: fields.recommendation || "Review and apply security best practices.",
        cvss_score: fields.cvss_score ?? null,
        owasp_category: fields.owasp_category ?? null,
        owasp_masvs: fields.owasp_masvs ?? null,
        engine: engineName,
    };
}
