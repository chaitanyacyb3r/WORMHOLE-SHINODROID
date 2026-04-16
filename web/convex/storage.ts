import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Generate a pre-signed upload URL for APK files.
 * Client uploads directly to this URL — no 20MB proxy limit.
 * Replaces: Supabase Storage upload
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // RATE LIMITING: Prevent Storage Exhaustion DoS
        const activeScans = await ctx.db
            .query("scans")
            .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "pending"))
            .collect();
            
        const scanningScans = await ctx.db
            .query("scans")
            .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "scanning"))
            .collect();
            
        if (activeScans.length + scanningScans.length >= 3) {
            throw new Error("Rate limit exceeded: You can only have 3 active scans at a time. Please wait for them to finish.");
        }

        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Get a download URL for a stored file (user-facing with auth check).
 * Replaces: supabase.storage.from('apks').createSignedUrl(path, 3600)
 */
export const getDownloadUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Security: verify the storage ID belongs to one of this user's scans
        const userScans = await ctx.db
            .query("scans")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const ownsFile = userScans.some(
            (s) =>
                s.storageId === args.storageId ||
                s.reportStorageId === args.storageId ||
                s.dynamicReportStorageId === args.storageId ||
                s.aiReportStorageId === args.storageId
        );

        if (!ownsFile) return null;

        return await ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Get a download URL for a report PDF (with scan ownership check).
 */
export const getReportUrl = query({
    args: { scanId: v.id("scans") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const scan = await ctx.db.get(args.scanId);
        if (!scan || scan.userId !== userId) return null;

        const urls: Record<string, string | null> = {};
        if (scan.reportStorageId) {
            urls.static = await ctx.storage.getUrl(scan.reportStorageId);
        }
        if (scan.dynamicReportStorageId) {
            urls.dynamic = await ctx.storage.getUrl(scan.dynamicReportStorageId);
        }
        if (scan.aiReportStorageId) {
            urls.ai = await ctx.storage.getUrl(scan.aiReportStorageId);
        }
        return urls;
    },
});

/**
 * Delete a file from storage (internal, for worker cleanup).
 */
export const deleteFile = internalMutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        await ctx.storage.delete(args.storageId);
    },
});

/**
 * Generate upload URL (internal, for worker to upload reports).
 */
export const generateUploadUrlInternal = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Get download URL (internal, no auth check — for worker).
 */
export const getUrlInternal = internalQuery({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});
