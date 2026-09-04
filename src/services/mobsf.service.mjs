import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Config } from "../config/config.mjs";
import { safeFetch } from "../utils/helpers.mjs";

export class MobSfService {
    static _headers(extra = {}) {
        return {
            Authorization: Config.MOBSF_API_KEY,
            ...extra
        };
    }

    /**
     * Finds the local MobSF installation directory by probing common locations.
     * @returns {string|null}
     */
    static findMobSfDir() {
        const home = homedir();
        const candidates = [
            process.env.MOBSF_PATH,
            process.env.MOBSF_DIR,
            join(home, "Documents", "Mobile-Security-Framework-MobSF"),
            join(home, "Mobile-Security-Framework-MobSF"),
            join(home, "Documents", "MobSF"),
            join(home, "MobSF"),
            "C:\\Mobile-Security-Framework-MobSF",
            "C:\\MobSF",
        ].filter(Boolean);

        for (const dir of candidates) {
            try {
                if (existsSync(join(dir, "run.bat"))) {
                    return dir;
                }
            } catch { /* ignore permission errors */ }
        }
        return null;
    }

    /**
     * Checks if the MobSF service is reachable.
     */
    static async isAlive() {
        try {
            const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/scans?page=1&page_size=1`, {
                headers: this._headers(),
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Checks if MobSF is running; if not, automatically launches it in the background
     * and waits up to maxWaitSeconds for the REST API to become responsive.
     * 
     * @param {number} maxWaitSeconds
     * @returns {Promise<boolean>}
     */
    static async ensureRunning(maxWaitSeconds = 40) {
        if (await this.isAlive()) return true;

        const mobsfDir = this.findMobSfDir();
        if (!mobsfDir) {
            return false;
        }

        if (process.platform === "win32") {
            try {
                const child = spawn("cmd.exe", [
                    "/c",
                    "start",
                    "MobSF Core Service",
                    "/min",
                    "cmd.exe",
                    "/k",
                    `cd /d "${mobsfDir}" && call mobsf-venv\\Scripts\\activate.bat && run.bat`
                ], {
                    detached: true,
                    stdio: "ignore"
                });
                child.unref();
            } catch {
                return false;
            }
        }

        // Wait for MobSF to bind and respond to REST requests
        for (let i = 0; i < maxWaitSeconds; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (await this.isAlive()) {
                return true;
            }
        }
        return false;
    }

    static async fetchRecentScans(limit = 5) {
        const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/scans?page=1&page_size=${limit}`, {
            headers: this._headers(),
        });
        if (!res.ok) throw new Error("Failed to fetch recent scans from MobSF");
        return await res.json();
    }

    static async upload(fileBuffer, fileName) {
        const form = new FormData();
        form.append("file", new Blob([fileBuffer]), fileName);

        const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/upload`, {
            method: "POST",
            headers: this._headers(),
            body: form,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Upload failed (HTTP ${res.status}): ${err.slice(0, 200)}`);
        }
        return await res.json();
    }

    static async scan(hash) {
        const form = new URLSearchParams();
        form.append("hash", hash);

        const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/scan`, {
            method: "POST",
            headers: this._headers({ "Content-Type": "application/x-www-form-urlencoded" }),
            body: form.toString(),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Scan failed (HTTP ${res.status}): ${err.slice(0, 200)}`);
        }
        return true;
    }

    static async getJsonReport(hash) {
        const form = new URLSearchParams();
        form.append("hash", hash);

        const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/report_json`, {
            method: "POST",
            headers: this._headers({ "Content-Type": "application/x-www-form-urlencoded" }),
            body: form.toString(),
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch JSON report (HTTP ${res.status})`);
        }
        
        const text = await res.text();
        if (text.length > Config.MAX_BODY_BYTES) {
            throw new Error("Report JSON size exceeds maximal allowed body bytes.");
        }
        return JSON.parse(text);
    }

    static async downloadPdf(hash) {
        const form = new URLSearchParams();
        form.append("hash", hash);

        const res = await safeFetch(`${Config.MOBSF_URL}/api/v1/download_pdf`, {
            method: "POST",
            headers: this._headers({ "Content-Type": "application/x-www-form-urlencoded" }),
            body: form.toString(),
        });

        if (!res.ok) {
            throw new Error(`Failed to download PDF report (HTTP ${res.status})`);
        }
        return Buffer.from(await res.arrayBuffer());
    }
}
