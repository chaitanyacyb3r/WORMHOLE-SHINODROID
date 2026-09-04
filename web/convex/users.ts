import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get current user's profile info.
 * Replaces: supabase.auth.getUser() + supabase.from('profiles').select()
 */
export const viewer = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const user = await ctx.db.get(userId);
        return user;
    },
});

/**
 * Update the current user's profile name.
 * Replaces: supabase.from('profiles').update({ full_name }).eq('id', uid)
 */
export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(userId, { name: args.name });
    },
});
