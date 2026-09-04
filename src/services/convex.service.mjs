import { Config } from "../config/config.mjs";
import { Logger } from "../utils/logger.mjs";
import { stat, readFile } from "node:fs/promises";

// Dynamic import fallback for robust initialisation
let internalApi;
let convexClientInstance;

export class ConvexService {
    static async _getClient() {
        if (!convexClientInstance) {
            const { ConvexHttpClient } = await import("convex/browser");
            if (!Config.CONVEX_URL) throw new Error("CONVEX_URL is not configured.");
            convexClientInstance = new ConvexHttpClient(Config.CONVEX_URL);
            if (Config.CONVEX_DEPLOY_KEY) {
                convexClientInstance.setAdminAuth(Config.CONVEX_DEPLOY_KEY);
            }
        }
        return convexClientInstance;
    }

    static async _getApi() {
        if (!internalApi) {
            // Need to cleanly resolve to the dynamically built API from web space
            const mod = await import("../../web/convex/_generated/api.js");
            internalApi = mod.internal;
        }
        return internalApi;
    }

    /**
     * Test if Convex is reachable.
     */
    static async isAlive() {
        try {
            const api = await this._getApi();
            const client = await this._getClient();
            await client.query(api.scans.listPending, {});
            return true;
        } catch {
            return false;
        }
    }

    static async getPendingScans() {
        const client = await this._getClient();
        const api = await this._getApi();
        return await client.query(api.scans.listPending, {});
    }

    static async getFileUrl(storageId) {
        const client = await this._getClient();
        const api = await this._getApi();
        return await client.query(api.scans.getFileUrl, { storageId });
    }

    static async updateScanStatus(args) {
        const client = await this._getClient();
        const api = await this._getApi();
        return await client.mutation(api.scans.updateStatus, args);
    }

    static async insertFindings(findingsToInsert, scanId) {
        if (!findingsToInsert || findingsToInsert.length === 0) return;
        
        const client = await this._getClient();
        const api = await this._getApi();

        const MAX_FINDINGS = 2000;
        let findings = [...findingsToInsert];

        if (findings.length > MAX_FINDINGS) {
            Logger.warn(`Scan ${scanId} generated ${findings.length} findings. Truncating to ${MAX_FINDINGS}.`);
            findings = findings.slice(0, MAX_FINDINGS);
            findings.push({
                title: "Maximum Findings Reached",
                severity: "info",
                severityOrder: 5,
                category: "System",
                description: `This scan generated more than ${MAX_FINDINGS} findings. To prevent performance degradation, further findings have been truncated.`
            });
        }

        const chunkSize = 50;
        for (let i = 0; i < findings.length; i += chunkSize) {
            const chunk = findings.slice(i, i + chunkSize);
            const convexFindings = chunk.map(f => ({
                scanId,
                title: f.title || "Untitled",
                severity: f.severity || "info",
                severityOrder: f.severity_order || 0,
                category: f.category || f.engine || "general",
                description: f.description || undefined,
                recommendation: f.recommendation || undefined,
                cvssScore: f.cvss_score || undefined,
                owaspCategory: f.owasp_category || undefined,
            }));

            try {
                await client.mutation(api.findings.batchInsert, { findings: convexFindings });
            } catch (err) {
                Logger.warn(`Failed to insert findings chunk: ${err.message}`);
            }
        }
        Logger.ok(`Inserted ${findings.length} findings to Convex`);
    }

    static async uploadToStorage(localPath, contentType) {
        try {
            await stat(localPath);
            const buffer = await readFile(localPath);
            const client = await this._getClient();
            const api = await this._getApi();

            const uploadUrl = await client.mutation(api.storage.generateUploadUrlInternal, {});

            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": contentType },
                body: buffer,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const { storageId } = await response.json();
            return storageId;
        } catch (e) {
            Logger.warn(`Failed uploading ${localPath} to storage: ${e.message}`);
            return null;
        }
    }
}
