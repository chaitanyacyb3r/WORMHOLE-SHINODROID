import { Logger } from "../utils/logger.mjs";
import { ConvexService } from "../services/convex.service.mjs";
import { AnalysisPipeline } from "../core/pipeline.mjs";

export class ConvexPoller {
    static isPolling = false;
    static pollCount = 0;
    static consecutiveFailures = 0;

    static async poll() {
        if (ConvexPoller.isPolling) return;
        ConvexPoller.isPolling = true;
        ConvexPoller.pollCount++;

        try {
            const pollStart = Date.now();
            const pendingScans = await ConvexService.getPendingScans();
            const pollMs = Date.now() - pollStart;

            ConvexPoller.consecutiveFailures = 0;

            if (pendingScans && pendingScans.length > 0) {
                const scan = pendingScans[0];
                Logger.info(`Poll #${ConvexPoller.pollCount}: 🔔 Found pending scan! (${pollMs}ms) | File: ${scan.fileName}`);
                
                // Fetch the bytes from Convex Storage
                Logger.step(`[Convex] Downloading APK from Convex storage...`);
                const downloadUrl = await ConvexService.getFileUrl(scan.storageId);
                if (!downloadUrl) throw new Error("Could not get download URL for APK");

                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

                const fileBuffer = Buffer.from(await response.arrayBuffer());

                // Trigger pipeline (using source: "convex" so it knows to sync findings back to DB)
                await AnalysisPipeline.run(fileBuffer, scan.fileName, {
                    scanId: scan._id,
                    source: "convex",
                });

                ConvexPoller.isPolling = false;
                setImmediate(() => ConvexPoller.poll());
                return;
            } else {
                if (ConvexPoller.pollCount === 1 || ConvexPoller.pollCount % 4 === 0) {
                    Logger.info(`Poll #${ConvexPoller.pollCount}: No pending Web Dashboard scans (${pollMs}ms) — waiting...`);
                }
            }
        } catch (err) {
            Logger.error(`Poll #${ConvexPoller.pollCount}: Web API Exception — ${err.message}`);
            ConvexPoller.consecutiveFailures++;
            if (ConvexPoller.consecutiveFailures >= 3) {
                Logger.warn(`${ConvexPoller.consecutiveFailures} consecutive Web API poll failures — will retry...`);
                ConvexPoller.consecutiveFailures = 0;
            }
        } finally {
            ConvexPoller.isPolling = false;
        }
    }

    static start(intervalMs = 30000) {
        Logger.info("Starting Web Dashboard poll loop...");
        ConvexPoller.poll();
        return setInterval(() => ConvexPoller.poll(), intervalMs);
    }
}
