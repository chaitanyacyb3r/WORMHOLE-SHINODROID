import { Config } from "../config/config.mjs";

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export const ALLOWED_EXTENSIONS = new Set([
    ".apk", ".xapk", ".apks", ".aab",
    ".ipa",
    ".appx",
    ".zip",
]);

export function isValidMagicBytes(buf) {
    if (buf.length < 4) return false;
    return buf.subarray(0, 4).equals(ZIP_MAGIC);
}

export function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function elapsed(startMs) {
    const ms = Date.now() - startMs;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Sanitize error messages before storing in database.
 * Strictly prevents stack traces or paths from leaking to the client UI.
 */
export function sanitizeErrorMessage(msg) {
    if (!msg) return "An internal error occurred";
    let text = String(msg);
    if (text.includes("Download failed") || text.includes("File size exceeds")) {
        return text.slice(0, 150);
    }
    return "Analysis engine encountered a specialized error processing this APK format.";
}

/**
 * Fetch wrapper with AbortController timeout bounds
 */
export async function safeFetch(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Config.FETCH_TIMEOUT);
    try {
        return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}
