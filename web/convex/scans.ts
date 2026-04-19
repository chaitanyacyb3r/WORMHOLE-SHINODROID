import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── User-facing queries ─────────────────────────────────────────────────

/**
 * List all scans for the current user, newest first.
 * Replaces: supabase.from('scans').select().eq('user_id', uid).order('created_at', { ascending: false })
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("scans")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();
    },
});

/**
 * Get a single scan by ID with ownership check.
 * Replaces: supabase.from('scans').select().eq('id', scanId).single()
 */
export const get = query({
    args: { id: v.id("scans") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const scan = await ctx.db.get(args.id);
        if (!scan || scan.userId !== userId) return null;

        return scan;
    },
});

/**
 * Create a new pending scan after file upload.
 * Replaces: supabase.from('scans').insert({ user_id, file_name, file_path, file_size, status: 'pending' })
 */
export const create = mutation({
    args: {
        fileName: v.string(),
        filePath: v.string(),
        fileSize: v.number(),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // RATE LIMITING: Prevent backend DoS
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

        return await ctx.db.insert("scans", {
            userId,
            fileName: args.fileName,
            filePath: args.filePath,
            fileSize: args.fileSize,
            storageId: args.storageId,
            status: "pending",
            scanType: "static",
            findingsCritical: 0,
            findingsHigh: 0,
            findingsMedium: 0,
            findingsLow: 0,
            findingsInfo: 0,
        });
    },
});

/**
 * Cancel a pending or scanning scan (marks it as failed).
 */
export const cancel = mutation({
    args: { id: v.id("scans") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const scan = await ctx.db.get(args.id);
        if (!scan || scan.userId !== userId) throw new Error("Not found or unauthorized");

        if (scan.status === "pending" || scan.status === "scanning") {
            await ctx.db.patch(args.id, { status: "failed", errorMessage: "Cancelled by user" });
        }
    },
});

/**
 * Completely delete a scan from the dashboard history.
 */
export const remove = mutation({
    args: { id: v.id("scans") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const scan = await ctx.db.get(args.id);
        if (!scan || scan.userId !== userId) throw new Error("Not found or unauthorized");

        // Could also optionally clean up storageIds here, but we'll let Convex handle garbage collection later on or keep it simple
        await ctx.db.delete(args.id);
    },
});

// ── Internal functions (worker-only, not exposed to clients) ────────────

/**
 * List all pending scans (for worker polling).
 * Replaces: supabase.from('scans').select().eq('status', 'pending').order('created_at')
 */
export const listPending = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("scans")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .order("asc")
            .collect();
    },
});

/**
 * Update scan status and metadata (for worker).
 * Replaces: supabase.from('scans').update({...}).eq('id', scanId)
 */
export const updateStatus = internalMutation({
    args: {
        id: v.id("scans"),
        status: v.union(
            v.literal("pending"),
            v.literal("scanning"),
            v.literal("completed"),
            v.literal("failed")
        ),
        findingsCritical: v.optional(v.number()),
        findingsHigh: v.optional(v.number()),
        findingsMedium: v.optional(v.number()),
        findingsLow: v.optional(v.number()),
        findingsInfo: v.optional(v.number()),
        reportUrl: v.optional(v.string()),
        reportJson: v.optional(v.any()),
        errorMessage: v.optional(v.string()),
        reportStorageId: v.optional(v.id("_storage")),
        dynamicReportStorageId: v.optional(v.id("_storage")),
        aiReportStorageId: v.optional(v.id("_storage")),
        completedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        // Remove undefined values
        const cleanUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) cleanUpdates[key] = value;
        }
        await ctx.db.patch(id, cleanUpdates);
    },
});

/**
 * Get scan by ID without auth check (internal worker use).
 */
export const getInternal = internalQuery({
    args: { id: v.id("scans") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Get scan file download URL (internal worker use).
 */
export const getFileUrl = internalQuery({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});
