import { mkdir } from "node:fs/promises";
import process, { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { Config } from "./config/config.mjs";
import { Logger } from "./utils/logger.mjs";
import { setupFolderWatcher } from "./io/folder-watcher.mjs";
import { ConvexPoller } from "./io/convex-poller.mjs";
import { ConvexService } from "./services/convex.service.mjs";
import { MobSfService } from "./services/mobsf.service.mjs";

async function main() {
    // ── 1. Cyberpunk ASCII Art Banner ──
    Logger.banner();

    // Ensure scan intake and reporting directories exist
    await mkdir(Config.APK_INBOX_DIR, { recursive: true });
    await mkdir(Config.REPORTS_DIR, { recursive: true });

    // ── 2. Pre-flight Checks (with spinners) ──
    const mobsfSpinner = Logger.spinner("Probing MobSF core service...");
    const isMobsfUp = await MobSfService.isAlive();
    if (isMobsfUp) {
        mobsfSpinner.succeed(`MobSF service connected at ${Config.MOBSF_URL}`);
    } else {
        mobsfSpinner.fail(`MobSF service unreachable at ${Config.MOBSF_URL} — requests may fail`);
    }

    let isConvexUp = false;
    if (Config.CONVEX_URL) {
        const convexSpinner = Logger.spinner("Probing Convex cloud backend...");
        isConvexUp = await ConvexService.isAlive();
        if (isConvexUp) {
            convexSpinner.succeed("Convex cloud database connected");
        } else {
            convexSpinner.warn("Convex cloud database unreachable — web polls may fail");
        }
    }

    // Determine AI engine skip status
    const isSkipAi = Boolean(
        process.env.SKIP_AI &&
        process.env.SKIP_AI !== "0" &&
        process.env.SKIP_AI.toLowerCase() !== "false"
    );

    // ── 3. System Status Table ──
    Logger.systemStatus({
        mobsf: isMobsfUp,
        mobsfUrl: Config.MOBSF_URL,
        convex: Config.CONVEX_URL ? isConvexUp : "skip",
        convexUrl: Config.CONVEX_URL,
        inbox: Config.APK_INBOX_DIR,
        reports: Config.REPORTS_DIR,
        skipAi: isSkipAi,
    });

    // ── 4. Boot Listeners ──
    const watcher = await setupFolderWatcher();

    let pollerId = null;
    if (Config.CONVEX_URL) {
        pollerId = ConvexPoller.start();
    }

    // ── 5. Animated Ready Notification ──
    await Logger.ready("Ready — waiting for targets");

    // ── 6. Graceful Shutdown Handler ──
    const shutdown = async (sig) => {
        Logger.shutdown(sig);
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
const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);

if (isMainModule) {
    main().catch((err) => {
        Logger.error(`Fatal Daemon Crash: ${err.stack || err.message}`);
        process.exit(1);
    });
}
