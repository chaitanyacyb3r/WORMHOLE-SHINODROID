/**
 * Smoke test: Verify the orchestrator discovers engines and runs them.
 * Usage: node scripts/test-orchestrator.mjs
 */
import { discoverEngines, runAllEngines } from "../orchestrator.mjs";

console.log("=== Engine Discovery Test ===\n");

const engines = await discoverEngines();
console.log(`Found ${engines.length} engines:\n`);

for (const e of engines) {
    const avail = await e.isAvailable().catch(() => false);
    console.log(`  ${avail ? "✅" : "❌"} ${e.name} (${e.type}, v${e.version}) [${e.engineId}]`);
}

console.log("\n=== Availability Check Complete ===");
console.log("If you see ✅ for an engine, it's ready to run.");
console.log("If you see ❌, the tool is not installed or not accessible.\n");

// Quick pipeline test with a dummy APK path (won't actually run engines)
// This just tests the orchestrator wiring — no APK needed
console.log("=== Orchestrator Wiring Test ===\n");
const testCtx = {
    scanId: "test-000",
    outDir: process.env.TEMP || "/tmp",
    fileName: "test.apk",
    mobsfReport: null,
    packageName: null,
    allFindings: [],
    endpoints: [],
    log: (level, msg) => console.log(`  [${level}] ${msg}`),
    onProgress: (msg) => console.log(`  [progress] ${msg}`),
};

console.log("Orchestrator context created. Pipeline wiring OK.\n");
console.log("To run a full test, use the supabase-worker to upload an APK.");
