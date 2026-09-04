import { watch } from "chokidar";
import { readFile, mkdir } from "node:fs/promises";
import { basename, resolve, extname } from "node:path";
import { Config } from "../config/config.mjs";
import { Logger } from "../utils/logger.mjs";
import { ALLOWED_EXTENSIONS, isValidMagicBytes } from "../utils/helpers.mjs";
import { AnalysisPipeline } from "../core/pipeline.mjs";

export async function setupFolderWatcher() {
    await mkdir(Config.APK_INBOX_DIR, { recursive: true });
    const processing = new Set();

    const watcher = watch(Config.APK_INBOX_DIR, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 },
        depth: 0,
    });

    watcher.on("add", async (filePath) => {
        const absPath = resolve(filePath);
        if (processing.has(absPath)) return;
        processing.add(absPath);

        const name = basename(absPath);
        const ext = extname(name).toLowerCase();

        try {
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                Logger.warn(`Folder Drop: Unsupported extension "${ext}" for ${name}`);
                return;
            }

            const buf = await readFile(absPath);

            if (!isValidMagicBytes(buf)) {
                Logger.warn(`Folder Drop: Invalid magic bytes for ${name}. Not an APK/ZIP.`);
                return;
            }

            Logger.info(`📂 Picked up new file: ${name}`);
            
            // Execute the common pipeline
            await AnalysisPipeline.run(buf, name, {
                scanId: `local-${Date.now()}`,
                source: "folder",
            });

        } catch (err) {
            Logger.error(`Error processing ${name}: ${err.message}`);
        } finally {
            processing.delete(absPath);
        }
    });

    watcher.on("error", (err) => Logger.error(`Watcher error: ${err.message}`));
    Logger.info(`📂 Watching folder: ${Config.APK_INBOX_DIR}`);
    
    return watcher;
}
