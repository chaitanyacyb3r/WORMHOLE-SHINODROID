import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all findings for a scan (with ownership check).
 * Replaces: supabase.from('findings').select().eq('scan_id', scanId).order('severity_order')
 */
export const listByScan = query({
    args: { scanId: v.id("scans") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Verify the user owns this scan
        const scan = await ctx.db.get(args.scanId);
        if (!scan || scan.userId !== userId) return [];

        return await ctx.db
            .query("findings")
            .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
            .collect();
    },
});

/**
 * Batch insert findings (internal, for worker).
 * Replaces: supabase.from('findings').insert(findingsArray)
 *
 * Convex mutations have a write limit, so we process in batches
 * of up to 64 documents per call and return the count inserted.
 */
export const batchInsert = internalMutation({
    args: {
        findings: v.array(
            v.object({
                scanId: v.id("scans"),
                title: v.string(),
                severity: v.union(
                    v.literal("critical"),
                    v.literal("high"),
                    v.literal("medium"),
                    v.literal("low"),
                    v.literal("info")
                ),
                severityOrder: v.number(),
                category: v.string(),
                description: v.optional(v.string()),
                recommendation: v.optional(v.string()),
                cvssScore: v.optional(v.number()),
                owaspCategory: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const finding of args.findings) {
            await ctx.db.insert("findings", finding);
        }
        return args.findings.length;
    },
});
