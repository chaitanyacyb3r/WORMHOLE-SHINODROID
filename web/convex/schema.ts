import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
    // Auth tables (managed by Convex Auth — users, sessions, etc.)
    ...authTables,

    // ── Scans ─────────────────────────────────────────────────
    // Equivalent of Supabase 'scans' table
    scans: defineTable({
        userId: v.id("users"),
        fileName: v.string(),
        filePath: v.string(),
        fileSize: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("scanning"),
            v.literal("completed"),
            v.literal("failed")
        ),
        scanType: v.optional(v.string()),
        // Finding counts (denormalized for speed)
        findingsCritical: v.number(),
        findingsHigh: v.number(),
        findingsMedium: v.number(),
        findingsLow: v.number(),
        findingsInfo: v.number(),
        // Report
        reportUrl: v.optional(v.string()),
        reportJson: v.optional(v.any()),
        errorMessage: v.optional(v.string()),
        // Storage reference for APK file
        storageId: v.optional(v.id("_storage")),
        // Report PDF storage reference
        reportStorageId: v.optional(v.id("_storage")),
        dynamicReportStorageId: v.optional(v.id("_storage")),
        aiReportStorageId: v.optional(v.id("_storage")),
        pocReportStorageId: v.optional(v.id("_storage")),
        completedAt: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_status", ["status"])
        .index("by_userId_status", ["userId", "status"]),

    // ── Findings ──────────────────────────────────────────────
    // Equivalent of Supabase 'findings' table
    findings: defineTable({
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
        .index("by_scanId", ["scanId"])
        .index("by_severity", ["severityOrder"]),

    // ── CI/CD API Keys ───────────────────────────────────────────
    apiKeys: defineTable({
        userId: v.id("users"),
        name: v.string(),
        key: v.string(),
        active: v.boolean(),
        usageCount: v.number(),
        lastUsedAt: v.number(),
        createdAt: v.number(),
    })
        .index("by_key", ["key"])
        .index("by_userId", ["userId"]),
});
