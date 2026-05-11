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
