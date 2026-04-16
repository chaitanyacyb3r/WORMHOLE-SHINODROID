/**
 * Shinodroid — Engine Orchestrator
 *
 * Discovers engine modules in ./engines/, checks availability,
 * runs them in the correct order, and merges all findings.
 *
 * ─── EXECUTION ORDER ──────────────────────────────────────────────────────
 *   1. Static engines  — run in parallel (MobSF, Androwarn, APKHunt, Firebase)
 *   2. Dynamic engines  — run sequentially (Frida, Logcat — share emulator)
 *   3. Network engines  — run sequentially (mitmproxy, Nuclei — use discovered endpoints)
 *   4. SCA engines      — run in parallel (Dependency-Check, Syft)
 *   5. AI engine        — runs last (needs all findings from above)
 * ──────────────────────────────────────────────────────────────────────────
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Bug #4 fix: import.meta.dirname is only available in Node.js >=21.
// Fallback to fileURLToPath for older versions.
const ENGINES_DIR = join(
    import.meta.dirname || dirname(fileURLToPath(import.meta.url)),
    "engines"
);

// ── Engine type execution order ─────────────────────────────────────────
const TYPE_ORDER = ["static", "dynamic", "network", "sca", "ai"];

// ── Logging helper ──────────────────────────────────────────────────────
function defaultLog(level, msg) {
    const prefix = { ok: "✅", warn: "⚠️", error: "❌", info: "ℹ️" }[level] || "•";
    console.log(`[Orchestrator] ${prefix} ${msg}`);
}

// ── Discover all engines ────────────────────────────────────────────────

/**
 * Scan the engines/ directory and import all *.engine.mjs files.
 * Returns array of engine objects, sorted by type execution order.
 *
 * @returns {Promise<Object[]>}
 */
export async function discoverEngines() {
    const files = await readdir(ENGINES_DIR);
    const engines = [];

    for (const file of files) {
        if (!file.endsWith(".engine.mjs")) continue;

        try {
            const fileUrl = pathToFileURL(join(ENGINES_DIR, file)).href;
            const mod = await import(fileUrl);
            const engine = mod.default;

            // ── LSP: Validate engine meets the interface contract ────────
            const issues = validateEngine(engine, file);
            if (issues.length > 0) {
                defaultLog("warn", `Skipping ${file}: ${issues.join(", ")}`);
                continue;
            }

            // Derive engineId from filename: "mobsf.engine.mjs" → "mobsf"
            if (!engine.engineId) {
                engine.engineId = file.replace(".engine.mjs", "");
            }

            engines.push(engine);
        } catch (err) {
            defaultLog("error", `Failed to load engine ${file}: ${err.message}`);
        }
    }

    // Sort by type execution order
    engines.sort((a, b) => {
        const ai = TYPE_ORDER.indexOf(a.type);
        const bi = TYPE_ORDER.indexOf(b.type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return engines;
}

/**
 * SOLID (LSP): Validate that an engine object meets the interface contract.
 * Every engine must be substitutable — if it claims to be an engine,
 * it must have the required shape. This prevents runtime crashes from
 * badly-written engines.
 *
 * @param {Object} engine
 * @param {string} fileName
 * @returns {string[]} List of issues (empty = valid)
 */
function validateEngine(engine, fileName) {
    const issues = [];
    if (!engine) issues.push("default export is null/undefined");
    if (!engine?.name || typeof engine.name !== "string") issues.push("missing 'name' (string)");
    if (!engine?.type || !TYPE_ORDER.includes(engine.type)) issues.push(`invalid 'type': ${engine?.type} (must be one of: ${TYPE_ORDER.join(", ")})`);
    if (!engine?.version || typeof engine.version !== "string") issues.push("missing 'version' (string)");
    if (typeof engine?.isAvailable !== "function") issues.push("missing 'isAvailable' (function)");
    if (typeof engine?.run !== "function") issues.push("missing 'run' (function)");
    return issues;
}

// ── Run all engines ─────────────────────────────────────────────────────

/**
 * Run all available engines against an APK.
 *
 * @param {string} apkPath  - Absolute path to the APK file on disk
 * @param {import("./engines/_engine-interface.mjs").EngineContext} context
 * @returns {Promise<{engines: Object[], findings: Object[], summary: Object}>}
 */
export async function runAllEngines(apkPath, context) {
    const log = context.log || defaultLog;
    const engines = await discoverEngines();
    const results = [];

    // SOLID (OCP): Build engine lookup map so enrichContext() can
    // delegate to engine-defined enrichContext methods without
    // the orchestrator knowing which engines exist.
    context._engineMap = new Map(engines.map(e => [e.engineId, e]));

    // ── Check availability ──────────────────────────────────────────────
    log("info", `Checking ${engines.length} discovered engine(s)...`);
    const available = [];
    const unavailable = [];

    for (const engine of engines) {
        try {
            const checkStart = Date.now();
            const ok = await engine.isAvailable();
            const checkMs = Date.now() - checkStart;
            if (ok) {
                available.push(engine);
                log("ok", `  ├─ ${engine.name} v${engine.version || "?"} [${engine.type}] — READY (${checkMs}ms)`);
            } else {
                unavailable.push(engine.name);
                log("warn", `  ├─ ${engine.name} [${engine.type}] — NOT INSTALLED (${checkMs}ms)`);
            }
        } catch (err) {
            unavailable.push(engine.name);
            log("warn", `  ├─ ${engine.name} [${engine.type}] — CHECK FAILED: ${err.message}`);
        }
    }
    log("info", `  └─ ${available.length}/${engines.length} engines ready (skipping: ${unavailable.join(", ") || "none"})`);
    log("info", "");

    // ── Group by type ───────────────────────────────────────────────────
    const groups = {};
    for (const type of TYPE_ORDER) {
        groups[type] = available.filter(e => e.type === type);
    }

    // ── Phase 1: Static engines (parallel) ──────────────────────────────
    if (groups.static.length > 0) {
        log("info", `━━━ PHASE 1: Static Analysis (${groups.static.length} engine${groups.static.length > 1 ? "s" : ""} in parallel) ━━━`);
        for (const e of groups.static) log("info", `  • ${e.name}`);
        const staticStart = Date.now();
        const staticResults = await Promise.allSettled(
            groups.static.map(engine => runEngineSafe(engine, apkPath, context, log))
        );
        for (const r of staticResults) {
            if (r.status === "fulfilled" && r.value) results.push(r.value);
        }
        log("info", `  ⏱  Static phase completed in ${Date.now() - staticStart}ms`);
        // Update context with any data from static engines (e.g., MobSF report)
        enrichContext(context, results);
        if (context.packageName) log("info", `  📦 Package: ${context.packageName}`);
        log("info", "");
    }

    // ── Phase 2: Dynamic engines (sequential — share emulator) ──────────
    if (groups.dynamic.length > 0) {
        log("info", `━━━ PHASE 2: Dynamic Analysis (${groups.dynamic.length} engine${groups.dynamic.length > 1 ? "s" : ""} sequential) ━━━`);
        const dynStart = Date.now();
        for (const engine of groups.dynamic) {
            const result = await runEngineSafe(engine, apkPath, context, log);
            if (result) results.push(result);
            enrichContext(context, results);
        }
        log("info", `  ⏱  Dynamic phase completed in ${Date.now() - dynStart}ms`);
        log("info", "");
    }

    // ── Phase 3: Network engines (sequential) ───────────────────────────
    if (groups.network.length > 0) {
        log("info", `━━━ PHASE 3: Network Analysis (${groups.network.length} engine${groups.network.length > 1 ? "s" : ""}) ━━━`);
        for (const engine of groups.network) {
            const result = await runEngineSafe(engine, apkPath, context, log);
            if (result) results.push(result);
        }
        log("info", "");
    }

    // ── Phase 4: SCA engines (parallel) ─────────────────────────────────
    if (groups.sca.length > 0) {
        log("info", `━━━ PHASE 4: Supply Chain Analysis (${groups.sca.length} engine${groups.sca.length > 1 ? "s" : ""}) ━━━`);
        const scaResults = await Promise.allSettled(
            groups.sca.map(engine => runEngineSafe(engine, apkPath, context, log))
        );
        for (const r of scaResults) {
            if (r.status === "fulfilled" && r.value) results.push(r.value);
        }
        log("info", "");
    }

    // ── Phase 5: AI triage (last — needs all findings) ──────────────────
    if (groups.ai.length > 0) {
        // Collect all findings so far for AI to process
        context.allFindings = results.flatMap(r => r?.findings || []);
        log("info", `━━━ PHASE 5: AI Triage (${context.allFindings.length} findings to analyze) ━━━`);
        for (const engine of groups.ai) {
            const result = await runEngineSafe(engine, apkPath, context, log);
            if (result) results.push(result);
        }
        log("info", "");
    }

    // ── Build final output ──────────────────────────────────────────────
    const allFindings = results.flatMap(r => r?.findings || []);
    const summary = buildSummary(results, allFindings);

    log("ok", `✅ All engines complete: ${allFindings.length} total findings across ${results.filter(r => r.success).length} engines`);

    return { engines: results, findings: allFindings, summary };
}

// ── Safe engine runner ──────────────────────────────────────────────────

/**
 * Run a single engine with full error isolation.
 * If the engine throws, we catch it and return a failed result —
 * never crashing the overall pipeline.
 */
async function runEngineSafe(engine, apkPath, context, log) {
    const start = Date.now();
    log("info", `  ▸ [${engine.engineId}] Starting ${engine.name}...`);

    try {
        const result = await engine.run(apkPath, context);
        const duration = Date.now() - start;

        if (!result) {
            log("warn", `  ✗ [${engine.engineId}] Returned null/undefined (${duration}ms)`);
            return { engine: engine.engineId, success: false, findings: [], metadata: {}, error: "Engine returned no result", durationMs: duration };
        }

        result.durationMs = result.durationMs || duration;
        const secs = (duration / 1000).toFixed(1);

        if (result.skipped) {
            log("warn", `  ⊘ [${engine.engineId}] SKIPPED — ${result.error || "no reason given"} (${secs}s)`);
        } else if (result.success) {
            log("ok", `  ✓ [${engine.engineId}] DONE — ${result.findings?.length || 0} findings in ${secs}s`);
        } else {
            log("error", `  ✗ [${engine.engineId}] FAILED — ${result.error || "unknown error"} (${secs}s)`);
        }

        return result;

    } catch (err) {
        const duration = Date.now() - start;
        log("error", `  ✗ [${engine.engineId}] CRASHED — ${err.message} (${(duration / 1000).toFixed(1)}s)`);
        return {
            engine: engine.engineId,
            success: false,
            findings: [],
            metadata: {},
            error: `Engine crash: ${err.message}`,
            durationMs: duration,
        };
    }
}

// ── Context enrichment ──────────────────────────────────────────────────

/**
 * After each engine phase, enrich the context with any useful data
 * the next phase might need (e.g., MobSF report, package name, endpoints).
 *
 * SOLID (OCP): Instead of hardcoding engine names here, each engine
 * can optionally export an `enrichContext(context, result)` method.
 * If an engine doesn't provide one, we use generic metadata merging.
 *
 * Bug #3 fix: Track which results have already been enriched to prevent
 * duplicate processing (especially duplicate endpoint appending).
 */
function enrichContext(context, results) {
    // Track enriched results to avoid re-processing on subsequent calls
    if (!context._enriched) context._enriched = new Set();

    for (const result of results) {
        if (!result?.metadata) continue;

        // Skip results we've already processed
        const resultKey = `${result.engine}-${result.durationMs}`;
        if (context._enriched.has(resultKey)) continue;
        context._enriched.add(resultKey);

        // If the engine defines its own enrichContext, delegate to it (OCP)
        const engine = context._engineMap?.get(result.engine);
        if (engine?.enrichContext) {
            engine.enrichContext(context, result);
            continue;
        }

        // Generic metadata merging — engines provide well-known keys
        // in their metadata and the orchestrator merges them automatically.
        // No hardcoded engine names needed. (DIP)
        if (result.metadata.reportData && !context.mobsfReport) {
            context.mobsfReport = result.metadata.reportData;
        }
        if (result.metadata.packageName && !context.packageName) {
            context.packageName = result.metadata.packageName;
        }
        if (result.metadata.outDir && !context.outDir) {
            context.outDir = result.metadata.outDir;
        }
        if (result.metadata.hash && !context.mobsfHash) {
            context.mobsfHash = result.metadata.hash;
        }
        if (result.metadata.endpoints) {
            context.endpoints = [...(context.endpoints || []), ...result.metadata.endpoints];
        }
    }
}

// ── Summary builder ─────────────────────────────────────────────────────

/**
 * Build a summary object from all engine results.
 */
function buildSummary(results, allFindings) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of allFindings) {
        if (counts[f.severity] !== undefined) counts[f.severity]++;
    }

    const engineSummaries = results.map(r => ({
        engine: r.engine,
        success: r.success,
        skipped: r.skipped || false,
        findingCount: r.findings?.length || 0,
        durationMs: r.durationMs || 0,
        error: r.error || null,
    }));

    return {
        totalFindings: allFindings.length,
        ...counts,
        enginesRun: results.filter(r => r.success).length,
        enginesSkipped: results.filter(r => r.skipped).length,
        enginesFailed: results.filter(r => !r.success && !r.skipped).length,
        totalDurationMs: results.reduce((sum, r) => sum + (r.durationMs || 0), 0),
        engines: engineSummaries,
    };
}
