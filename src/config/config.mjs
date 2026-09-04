import { config as loadDotenv } from "dotenv";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load root .env
loadDotenv();
// Try to load web/.env.local (for Convex credentials if not at root)
try {
    loadDotenv({ path: join(resolve(fileURLToPath(import.meta.url), "../../../web"), ".env.local") });
} catch { /* ignore if web folder not present */ }

/**
 * Clean and validate MobSF URL
 */
function validateMobsfUrl(urlStr) {
    const url = (urlStr || "http://127.0.0.1:8000").replace(/\/+$/, "");
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
        const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(host);
        const isDockerService = /^[a-z][a-z0-9_-]*$/.test(host) && !host.includes(".");
        const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host);
        
        if (!isLoopback && !isDockerService && !isPrivateIP) {
            console.warn(`⚠️ Security Warning: MOBSF_URL must point to localhost, Docker service, or private IP. Got: ${host}`);
        }
    } catch {
        console.error(`❌ Invalid MOBSF_URL: ${url}`);
        process.exit(1);
    }
    return url;
}

export const Config = {
    // ── MobSF Settings ──
    MOBSF_URL: validateMobsfUrl(process.env.MOBSF_URL),
    MOBSF_API_KEY: process.env.MOBSF_API_KEY || "",

    // ── Paths ──
    APK_INBOX_DIR: resolve(process.env.APK_INBOX_DIR || "C:\\MobSF-Scans\\inbox"),
    REPORTS_DIR: resolve(process.env.REPORTS_OUTPUT_DIR || "C:\\MobSF-Scans\\reports"),

    // ── Convex Settings ──
    CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "",
    CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY || "",

    // ── Global Constraints ──
    FETCH_TIMEOUT: 180_000, // 3 minutes
    MAX_APK_SIZE: 100 * 1024 * 1024, // 100 MB
    MAX_BODY_BYTES: 20 * 1024 * 1024, // 20 MB max response body allowed from APIs
};

// Fail fast if critical secrets are missing
if (!Config.MOBSF_API_KEY) {
    console.error("❌ Fatal Error: MOBSF_API_KEY is not set in .env.");
    process.exit(1);
}
