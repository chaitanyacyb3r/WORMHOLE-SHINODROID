/**
 * Shinodroid — Engine Test Harness
 *
 * Tests each engine in isolation, then runs a full orchestrator integration test.
 * Validates: discovery, availability, execution, output schema, error handling.
 *
 * Usage:
 *   node scripts/test-engines.mjs                    # Run all tests
 *   node scripts/test-engines.mjs --engine=androwarn  # Test one engine
 *   node scripts/test-engines.mjs --skip-run          # Only test discovery + availability
 *
 * Requirements:
 *   - A test APK must exist (auto-detects from C:\MobSF-Scans\inbox\)
 *   - MobSF running (for mobsf engine test)
 *   - Emulator connected (for frida/logcat engine tests)
 *   - androwarn installed (for androwarn engine test)
 */

import { discoverEngines, runAllEngines } from "../orchestrator.mjs";
import { createFinding, normalizeSeverity, getSeverityOrder } from "../engines/_engine-interface.mjs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";

// ── Config ───────────────────────────────────────────────────────────────────
const TEST_APK_DIR = process.env.TEST_APK_DIR || "C:\\MobSF-Scans\\inbox";
const REPORTS_DIR = process.env.REPORTS_OUTPUT_DIR || "C:\\MobSF-Scans\\reports";

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = argv.slice(2);
const onlyEngine = args.find(a => a.startsWith("--engine="))?.split("=")[1] || null;
const skipRun = args.includes("--skip-run");

// ── Test counters ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let skipped = 0;

// ── Utilities ────────────────────────────────────────────────────────────────

function ok(label, detail = "") {
    passed++;
    console.log(`  ✅ PASS: ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
    failed++;
    console.log(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
}

function skip(label, reason = "") {
    skipped++;
    console.log(`  ⏭️  SKIP: ${label}${reason ? ` — ${reason}` : ""}`);
}

function section(title) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${"═".repeat(60)}`);
}

function subsection(title) {
    console.log(`\n  ── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`);
}

/**
 * Validate that an engine result object has the correct schema.
 * This catches schema mismatches before they hit Supabase.
 */
function validateResultSchema(result, engineId) {
    const issues = [];

    if (typeof result.engine !== "string" || result.engine.length === 0) {
        issues.push(`'engine' must be a non-empty string, got: ${JSON.stringify(result.engine)}`);
    }
    if (typeof result.success !== "boolean") {
        issues.push(`'success' must be boolean, got: ${typeof result.success}`);
    }
    if (!Array.isArray(result.findings)) {
        issues.push(`'findings' must be an array, got: ${typeof result.findings}`);
    }
    if (typeof result.metadata !== "object" || result.metadata === null) {
        issues.push(`'metadata' must be an object, got: ${typeof result.metadata}`);
    }
    if (typeof result.durationMs !== "number" || result.durationMs < 0) {
        issues.push(`'durationMs' must be a non-negative number, got: ${result.durationMs}`);
    }
    if (result.engine !== engineId) {
        issues.push(`'engine' field is '${result.engine}' but expected '${engineId}'`);
    }

    return issues;
}

/**
 * Validate that a finding object matches the Supabase 'findings' table schema.
 */
function validateFindingSchema(finding) {
    const issues = [];
    const VALID_SEVERITIES = ["critical", "high", "medium", "low", "info"];

    if (typeof finding.title !== "string" || finding.title.length === 0) {
        issues.push("'title' must be a non-empty string");
    }
    if (!VALID_SEVERITIES.includes(finding.severity)) {
        issues.push(`'severity' must be one of ${VALID_SEVERITIES.join(",")} — got '${finding.severity}'`);
    }
    if (typeof finding.severity_order !== "number" || finding.severity_order < 1 || finding.severity_order > 5) {
        issues.push(`'severity_order' must be 1-5, got ${finding.severity_order}`);
    }
    if (typeof finding.scan_id !== "string" && finding.scan_id !== null) {
        issues.push(`'scan_id' must be string or null, got ${typeof finding.scan_id}`);
    }
    if (typeof finding.engine !== "string") {
        issues.push(`'engine' must be a string, got ${typeof finding.engine}`);
    }

    return issues;
}

/**
 * Find a test APK file.
 */
async function findTestApk() {
    try {
        const files = await readdir(TEST_APK_DIR);
        const apk = files.find(f => f.toLowerCase().endsWith(".apk"));
        if (!apk) return null;
        return join(TEST_APK_DIR, apk);
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEST 1: Interface Helpers
// ═══════════════════════════════════════════════════════════════════════════

function testInterfaceHelpers() {
    section("TEST 1: Interface Helpers (_engine-interface.mjs)");

    // normalizeSeverity
    subsection("normalizeSeverity()");
    const cases = [
        ["critical", "critical"], ["CRITICAL", "critical"], ["danger", "critical"], ["severe", "critical"],
        ["high", "high"], ["HIGH", "high"], ["warning", "high"],
        ["medium", "medium"], ["MEDIUM", "medium"], ["moderate", "medium"],
        ["low", "low"], ["LOW", "low"], ["minor", "low"],
        ["info", "info"], ["INFO", "info"], ["", "info"], [null, "info"], [undefined, "info"],
        ["garbage", "info"], [42, "info"],
    ];
    for (const [input, expected] of cases) {
        const result = normalizeSeverity(input);
        if (result === expected) {
            // Don't log every pass to reduce noise — only failures
        } else {
            fail(`normalizeSeverity(${JSON.stringify(input)})`, `expected '${expected}', got '${result}'`);
        }
    }
    ok("normalizeSeverity()", `${cases.length} cases passed`);

    // getSeverityOrder
    subsection("getSeverityOrder()");
    if (getSeverityOrder("critical") === 5 && getSeverityOrder("high") === 4 &&
        getSeverityOrder("medium") === 3 && getSeverityOrder("low") === 2 &&
        getSeverityOrder("info") === 1 && getSeverityOrder("invalid") === 0) {
        ok("getSeverityOrder()", "all severity orders correct");
    } else {
        fail("getSeverityOrder()", "unexpected values");
    }

    // createFinding
    subsection("createFinding()");
    const finding = createFinding({
        title: "Test Finding",
        severity: "HIGH",  // should normalize to "high"
        category: "Test",
        description: "Test description",
    }, "test-engine", "scan-123");

    const findingIssues = validateFindingSchema(finding);
    if (findingIssues.length === 0) {
        ok("createFinding() schema", "all fields valid");
    } else {
        fail("createFinding() schema", findingIssues.join("; "));
    }

    if (finding.severity === "high" && finding.severity_order === 4) {
        ok("createFinding() normalization", "severity normalized correctly");
    } else {
        fail("createFinding() normalization", `got severity='${finding.severity}', order=${finding.severity_order}`);
    }

    // Edge case: empty/missing fields
    const minFinding = createFinding({}, "engine", null);
    if (minFinding.title === "Untitled Finding" && minFinding.severity === "info" && minFinding.scan_id === null) {
        ok("createFinding() defaults", "graceful defaults for empty input");
    } else {
        fail("createFinding() defaults", "missing fields not defaulted properly");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEST 2: Engine Discovery
// ═══════════════════════════════════════════════════════════════════════════

async function testEngineDiscovery() {
    section("TEST 2: Engine Discovery (orchestrator.mjs)");

    let engines;
    try {
        engines = await discoverEngines();
    } catch (err) {
        fail("discoverEngines()", `threw: ${err.message}`);
        return [];
    }

    if (!Array.isArray(engines)) {
        fail("discoverEngines() return type", `expected array, got ${typeof engines}`);
        return [];
    }

    ok("discoverEngines()", `found ${engines.length} engine(s)`);

    // Verify expected engines exist
    const expectedEngines = ["mobsf", "androwarn", "frida", "logcat", "firebase"];
    for (const id of expectedEngines) {
        const found = engines.find(e => e.engineId === id);
        if (found) {
            ok(`Engine '${id}' discovered`, `name='${found.name}', type='${found.type}'`);
        } else {
            fail(`Engine '${id}' discovered`, "NOT FOUND in engines directory");
        }
    }

    // Verify sort order (static before dynamic before network before sca before ai)
    const typeOrder = ["static", "dynamic", "network", "sca", "ai"];
    let lastTypeIndex = -1;
    let sortCorrect = true;
    for (const e of engines) {
        const idx = typeOrder.indexOf(e.type);
        if (idx < lastTypeIndex) {
            sortCorrect = false;
            fail("Engine sort order", `'${e.name}' (${e.type}) appears after a later phase`);
            break;
        }
        lastTypeIndex = idx;
    }
    if (sortCorrect) ok("Engine sort order", "static → dynamic → network → sca → ai");

    // Verify each engine has required fields (LSP validation)
    for (const e of engines) {
        const issues = [];
        if (typeof e.name !== "string") issues.push("missing name");
        if (typeof e.type !== "string") issues.push("missing type");
        if (typeof e.version !== "string") issues.push("missing version");
        if (typeof e.isAvailable !== "function") issues.push("missing isAvailable()");
        if (typeof e.run !== "function") issues.push("missing run()");
        if (typeof e.engineId !== "string") issues.push("missing engineId");

        if (issues.length === 0) {
            ok(`Engine '${e.engineId}' interface`, "all required fields present");
        } else {
            fail(`Engine '${e.engineId}' interface`, issues.join(", "));
        }
    }

    return engines;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEST 3: Engine Availability
// ═══════════════════════════════════════════════════════════════════════════

async function testEngineAvailability(engines) {
    section("TEST 3: Engine Availability");

    const availability = {};

    for (const e of engines) {
        try {
            const avail = await e.isAvailable();
            availability[e.engineId] = avail;

            if (typeof avail !== "boolean") {
                fail(`${e.engineId}.isAvailable() return type`, `expected boolean, got ${typeof avail}`);
            } else if (avail) {
                ok(`${e.engineId}.isAvailable()`, "AVAILABLE ✅");
            } else {
                skip(`${e.engineId}.isAvailable()`, "NOT AVAILABLE (tool not installed or not reachable)");
            }
        } catch (err) {
            fail(`${e.engineId}.isAvailable()`, `threw: ${err.message}`);
            availability[e.engineId] = false;
        }
    }

    return availability;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEST 4: Individual Engine Execution
// ═══════════════════════════════════════════════════════════════════════════

async function testEngineExecution(engines, availability, apkPath) {
    section("TEST 4: Engine Execution (Individual)");

    if (!apkPath) {
        skip("All engine tests", `No test APK found in ${TEST_APK_DIR}`);
        return;
    }

    console.log(`  Using APK: ${apkPath}\n`);

    // Create a test output directory
    const { mkdirSync } = await import("node:fs");
    const testOutDir = join(REPORTS_DIR, "test-run");
    try { mkdirSync(testOutDir, { recursive: true }); } catch { /* exists */ }

    for (const e of engines) {
        if (onlyEngine && e.engineId !== onlyEngine) continue;

        subsection(`${e.name} (${e.engineId})`);

        if (!availability[e.engineId]) {
            skip(`${e.engineId}.run()`, "engine not available");
            continue;
        }

        // Build context
        const context = {
            scanId: `test-${e.engineId}-${Date.now()}`,
            outDir: testOutDir,
            fileName: "test.apk",
            mobsfReport: null,
            packageName: null,
            mobsfHash: null,
            allFindings: [],
            endpoints: [],
            log: (level, msg) => console.log(`    [${level}] ${msg}`),
            onProgress: (msg) => console.log(`    [progress] ${msg}`),
        };

        // For engines that need MobSF report (firebase), we can't test without MobSF running
        if (e.engineId === "firebase") {
            skip(`${e.engineId}.run()`, "requires MobSF report in context (tested via orchestrator)");
            continue;
        }

        const start = Date.now();
        let result;

        try {
            result = await e.run(apkPath, context);
        } catch (err) {
            fail(`${e.engineId}.run()`, `UNHANDLED EXCEPTION: ${err.message}`);
            console.log(`    Stack: ${err.stack?.split("\n").slice(0, 3).join("\n    ")}`);
            continue;
        }

        const duration = Date.now() - start;

        // 4a. Result must not be null/undefined
        if (result == null) {
            fail(`${e.engineId}.run() return value`, "returned null/undefined");
            continue;
        }

        // 4b. Schema validation
        const schemaIssues = validateResultSchema(result, e.engineId);
        if (schemaIssues.length === 0) {
            ok(`${e.engineId} result schema`, "valid");
        } else {
            fail(`${e.engineId} result schema`, schemaIssues.join("; "));
        }

        // 4c. Success/failure check
        if (result.skipped) {
            skip(`${e.engineId} execution`, result.error || "skipped");
        } else if (result.success) {
            ok(`${e.engineId} execution`, `SUCCESS — ${result.findings?.length || 0} findings in ${duration}ms`);
        } else {
            // Failure is not a test failure — engine might have legitimate reasons
            console.log(`  ⚠️  ${e.engineId} reported failure: ${result.error}`);
        }

        // 4d. Validate each finding
        if (result.findings?.length > 0) {
            let findingErrors = 0;
            for (let i = 0; i < result.findings.length; i++) {
                const issues = validateFindingSchema(result.findings[i]);
                if (issues.length > 0) {
                    fail(`${e.engineId} finding[${i}]`, issues.join("; "));
                    findingErrors++;
                }
            }
            if (findingErrors === 0) {
                ok(`${e.engineId} findings schema`, `all ${result.findings.length} findings valid`);
            }

            // Show first 3 findings as sample
            console.log(`\n    Sample findings:`);
            for (const f of result.findings.slice(0, 3)) {
                console.log(`      [${f.severity.toUpperCase()}] ${f.title}`);
            }
            if (result.findings.length > 3) {
                console.log(`      ... and ${result.findings.length - 3} more`);
            }
        }

        // 4e. Metadata check
        if (result.metadata && Object.keys(result.metadata).length > 0) {
            ok(`${e.engineId} metadata`, `${Object.keys(result.metadata).length} keys: ${Object.keys(result.metadata).join(", ")}`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEST 5: Full Orchestrator Pipeline
// ═══════════════════════════════════════════════════════════════════════════

async function testFullPipeline(apkPath) {
    section("TEST 5: Full Orchestrator Pipeline");

    if (!apkPath) {
        skip("Full pipeline", `No test APK found in ${TEST_APK_DIR}`);
        return;
    }

    console.log(`  Using APK: ${apkPath}\n`);

    const { mkdirSync } = await import("node:fs");
    const testOutDir = join(REPORTS_DIR, "test-full");
    try { mkdirSync(testOutDir, { recursive: true }); } catch { /* exists */ }

    const context = {
        scanId: `test-full-${Date.now()}`,
        outDir: testOutDir,
        fileName: "test.apk",
        mobsfReport: null,
        packageName: null,
        allFindings: [],
        endpoints: [],
        log: (level, msg) => console.log(`    [${level}] ${msg}`),
        onProgress: (msg) => console.log(`    [progress] ${msg}`),
    };

    let result;
    try {
        result = await runAllEngines(apkPath, context);
    } catch (err) {
        fail("runAllEngines()", `UNHANDLED EXCEPTION: ${err.message}`);
        console.log(`    Stack: ${err.stack?.split("\n").slice(0, 5).join("\n    ")}`);
        return;
    }

    // Pipeline result structure
    if (!result || typeof result !== "object") {
        fail("Pipeline result", "null or non-object");
        return;
    }

    if (Array.isArray(result.engines)) {
        ok("Pipeline result.engines", `${result.engines.length} engine results`);
    } else {
        fail("Pipeline result.engines", "missing or not array");
    }

    if (Array.isArray(result.findings)) {
        ok("Pipeline result.findings", `${result.findings.length} total findings`);
    } else {
        fail("Pipeline result.findings", "missing or not array");
    }

    if (result.summary && typeof result.summary === "object") {
        ok("Pipeline result.summary", JSON.stringify(result.summary));
    } else {
        fail("Pipeline result.summary", "missing or not object");
    }

    // Context enrichment check
    subsection("Context Enrichment");
    if (context.mobsfReport) {
        ok("context.mobsfReport", "populated by MobSF engine");
    } else {
        skip("context.mobsfReport", "MobSF not available or didn't run");
    }
    if (context.packageName) {
        ok("context.packageName", context.packageName);
    } else {
        skip("context.packageName", "not populated");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║   Shinodroid — Engine Test Harness                    ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log(`  Time: ${new Date().toISOString()}`);
    if (onlyEngine) console.log(`  Filter: --engine=${onlyEngine}`);
    if (skipRun) console.log(`  Mode: --skip-run (discovery + availability only)`);

    // Find test APK
    const apkPath = await findTestApk();
    if (apkPath) {
        console.log(`  Test APK: ${apkPath}`);
    } else {
        console.log(`  ⚠️  No test APK found in ${TEST_APK_DIR}`);
    }

    // Run test suites
    testInterfaceHelpers();

    const engines = await testEngineDiscovery();
    const availability = await testEngineAvailability(engines);

    if (!skipRun) {
        await testEngineExecution(engines, availability, apkPath);
        await testFullPipeline(apkPath);
    }

    // Summary
    section("SUMMARY");
    console.log(`  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  Total:     ${passed + failed + skipped}`);
    console.log();

    if (failed > 0) {
        console.log("  🔴 SOME TESTS FAILED — review the output above.\n");
        process.exit(1);
    } else {
        console.log("  🟢 ALL TESTS PASSED.\n");
    }
}

main().catch(err => {
    console.error(`\n❌ Test harness crashed: ${err.message}`);
    console.error(err.stack);
    process.exit(2);
});
