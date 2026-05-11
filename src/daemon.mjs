import { mkdir } from "node:fs/promises";
import { Config } from "./config/config.mjs";
import { Logger } from "./utils/logger.mjs";
import { setupFolderWatcher } from "./io/folder-watcher.mjs";

import { ConvexPoller } from "./io/convex-poller.mjs";
import { ConvexService } from "./services/convex.service.mjs";
import { MobSfService } from "./services/mobsf.service.mjs";

async function main() {
    console.log();
    Logger.info(`╔══════════════════════════════════════════════════════╗`);
    Logger.info(`║  WORMHOLE // Shinodroid 忍ドロイド                   ║`);
    Logger.info(`║  Unified Daemon Service                              ║`);
    Logger.info(`╠══════════════════════════════════════════════════════╣`);
    Logger.info(`║  MobSF URL:  ${Config.MOBSF_URL.padEnd(40)}║`);
    Logger.info(`║  Inbox:      ${Config.APK_INBOX_DIR.padEnd(40).slice(0, 40)}║`);
    Logger.info(`║  Convex:     ${(Config.CONVEX_URL ? "Configured ✅" : "Missing ❌").padEnd(40)}║`);

    Logger.info(`╚══════════════════════════════════════════════════════╝`);
    console.log();

    await mkdir(Config.APK_INBOX_DIR, { recursive: true });
    await mkdir(Config.REPORTS_DIR, { recursive: true });

    // ── Pre-flight Checks ──
    const isMobsfUp = await MobSfService.isAlive();
    if (!isMobsfUp) Logger.warn("MobSF is currently unreachable. Requests may fail.");
    
    if (Config.CONVEX_URL) {
        const isConvexUp = await ConvexService.isAlive();
        if (!isConvexUp) Logger.warn("Convex DB is unreachable. Web dashboard polls may fail.");
    }

    // ── Boot Listeners ──
    const watcher = await setupFolderWatcher();

    let pollerId = null;

    if (Config.CONVEX_URL) {
        pollerId = ConvexPoller.start();
    }

    Logger.ok(`🟢 Ready! Listening for analysis requests across all configured channels...`);

    // ── Graceful Shutdown ──
    const shutdown = async (sig) => {
        Logger.info(`\n${sig} received, shutting down gracefully...`);
        if (watcher) await watcher.close();

        if (pollerId) clearInterval(pollerId);
        process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    if (process.platform === "win32") {
        process.on("SIGBREAK", () => shutdown("SIGBREAK"));
    }
}

// Only run main() when this file is executed directly.
import process, { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);

if (isMainModule) {
    main().catch((err) => {
        Logger.error(`Fatal Daemon Crash: ${err.stack || err.message}`);
        process.exit(1);
    });
}
