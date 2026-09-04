import {
  httpAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════════════
// Shinodroid CI/CD API
//
// Endpoints:
//   POST /api/v1/ci-scan       — Upload APK, start scan
//   GET  /api/v1/ci-scan/:id   — Poll scan status + results
//   POST /api/v1/ci-api-keys   — Create a new API key (admin only)
//
// Auth: Bearer token (API key) in Authorization header.
// All endpoints are unauthenticated (no Convex Auth) — they use API keys.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helper: Validate API Key ─────────────────────────────────────────────────

async function validateApiKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  request: Request
): Promise<{ valid: boolean; userId?: string; keyId?: string; error?: string }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header. Use: Bearer <api-key>" };
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return { valid: false, error: "API key is empty" };
  }

  // Look up key in DB
  const keyDoc: { _id: string; active: boolean; userId: string } | null =
    await ctx.runQuery(internal.cicd.findApiKey, { key: apiKey });
  if (!keyDoc) {
    return { valid: false, error: "Invalid API key" };
  }
  if (!keyDoc.active) {
    return { valid: false, error: "API key is deactivated" };
  }

  return { valid: true, userId: keyDoc.userId, keyId: keyDoc._id };
}

// ── Internal queries/mutations (not exposed via HTTP) ────────────────────────

/** Look up an API key by its secret value. */
export const findApiKey = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

/** Record API key usage (last used timestamp + increment counter). */
export const recordKeyUsage = internalMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) return;
    await ctx.db.patch(args.keyId, {
      lastUsedAt: Date.now(),
      usageCount: (key.usageCount || 0) + 1,
    });
  },
});

/** Create a scan from CI (no Convex Auth — uses API key's userId). */
export const createCiScan = internalMutation({
  args: {
    userId: v.id("users"),
    fileName: v.string(),
    fileSize: v.number(),
    storageId: v.id("_storage"),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit: max 5 concurrent CI scans per user
    const pending = await ctx.db
      .query("scans")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
    const scanning = await ctx.db
      .query("scans")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "scanning")
      )
      .collect();

    if (pending.length + scanning.length >= 5) {
      throw new Error("Rate limit: max 5 concurrent scans. Wait for existing scans to finish.");
    }

    return await ctx.db.insert("scans", {
      userId: args.userId,
      fileName: args.fileName,
      filePath: `ci/${args.fileName}`,
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

/** Get scan status (internal, no auth check). */
export const getCiScanStatus = internalQuery({
  args: { scanId: v.id("scans") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;

    // Get findings if scan is completed
    let findings: Array<{
      title: string;
      severity: string;
      category: string;
    }> = [];
    if (scan.status === "completed") {
      const allFindings = await ctx.db
        .query("findings")
        .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
        .collect();
      findings = allFindings.map((f) => ({
        title: f.title,
        severity: f.severity,
        category: f.category,
      }));
    }

    return {
      id: scan._id,
      status: scan.status,
      fileName: scan.fileName,
      findingsCritical: scan.findingsCritical,
      findingsHigh: scan.findingsHigh,
      findingsMedium: scan.findingsMedium,
      findingsLow: scan.findingsLow,
      findingsInfo: scan.findingsInfo,
      errorMessage: scan.errorMessage,
      completedAt: scan.completedAt,
      findings,
    };
  },
});

/** Create an API key (internal — called by admin endpoint). */
export const createApiKey = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("apiKeys", {
      userId: args.userId,
      name: args.name,
      key: args.key,
      active: true,
      usageCount: 0,
      lastUsedAt: 0,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Actions (public endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/**
 * GET /api/v1/ci-upload-url
 * Get a presigned URL to upload a large APK directly to storage.
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *
 * Response: { uploadUrl }
 */
export const ciGetUploadUrl = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = await validateApiKey(ctx as any, request);
  if (!auth.valid) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const uploadUrl = await ctx.runMutation(
    internal.storage.generateUploadUrlInternal
  );

  return jsonResponse({ uploadUrl });
});

/**
 * POST /api/v1/ci-scan
 * Start a scan after the APK has been uploaded to storage.
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *   Content-Type: application/json
 *
 * Body: { storageId: "<id>", fileName: "app.apk", fileSize: 12345 }
 *
 * Response: { scanId, status, message }
 */
export const ciScanUpload = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Auth
  const auth = await validateApiKey(ctx as any, request);
  if (!auth.valid) {
    return jsonResponse({ error: auth.error }, 401);
  }

  // Record usage
  await ctx.runMutation(internal.cicd.recordKeyUsage, {
    keyId: auth.keyId! as any,
  });

  const body = await request.json();
  const { storageId, fileName, fileSize } = body as {
    storageId: string;
    fileName: string;
    fileSize: number;
  };

  if (!storageId || !fileName || !fileSize) {
    return jsonResponse(
      { error: "Missing required fields: storageId, fileName, fileSize" },
      400
    );
  }

  if (!fileName.endsWith(".apk")) {
    return jsonResponse({ error: "Only .apk files are supported" }, 400);
  }

  // Create the scan record
  const scanId = await ctx.runMutation(internal.cicd.createCiScan, {
    userId: auth.userId! as any,
    fileName,
    fileSize,
    storageId: storageId as any,
    source: "ci",
  });

  return jsonResponse(
    {
      scanId,
      status: "pending",
      message: `Scan queued for ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)}MB). Poll GET /api/v1/ci-scan/${scanId} for results.`,
      pollUrl: `/api/v1/ci-scan/${scanId}`,
    },
    201
  );
});

/**
 * GET /api/v1/ci-scan/:scanId
 * Poll scan status and get results when complete.
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *
 * Response: { id, status, findings{critical,high,medium,low,info}, findings[] }
 */
export const ciScanStatus = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Auth
  const auth = await validateApiKey(ctx as any, request);
  if (!auth.valid) {
    return jsonResponse({ error: auth.error }, 401);
  }

  // Extract scan ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const scanId = pathParts[pathParts.length - 1];

  if (!scanId) {
    return jsonResponse({ error: "Missing scan ID in URL" }, 400);
  }

  const result = await ctx.runQuery(internal.cicd.getCiScanStatus, {
    scanId: scanId as any,
  });

  if (!result) {
    return jsonResponse({ error: "Scan not found" }, 404);
  }

  return jsonResponse(result);
});

/**
 * POST /api/v1/ci-api-keys
 * Generate a new CI/CD API key.
 *
 * This is a simple key generator. In production, you'd protect this
 * with admin auth. For now, it requires a master secret from env.
 *
 * Headers:
 *   Authorization: Bearer <SHINODROID_ADMIN_SECRET>
 *   Content-Type: application/json
 *
 * Body: { "userId": "<convex-user-id>", "name": "my-ci-key" }
 *
 * Response: { apiKey, message }
 */
export const ciCreateApiKey = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // For key creation, we use a simple admin secret from env
  const authHeader = request.headers.get("Authorization");
  const adminSecret = process.env.SHINODROID_ADMIN_SECRET;

  if (!adminSecret) {
    return jsonResponse(
      { error: "SHINODROID_ADMIN_SECRET not configured on server" },
      500
    );
  }

  if (authHeader !== `Bearer ${adminSecret}`) {
    return jsonResponse({ error: "Invalid admin secret" }, 403);
  }

  const body = await request.json();
  const { userId, name } = body as { userId: string; name: string };

  if (!userId || !name) {
    return jsonResponse(
      { error: "Missing required fields: userId, name" },
      400
    );
  }

  // Generate a random API key
  const key =
    "shino_" +
    Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  await ctx.runMutation(internal.cicd.createApiKey, {
    userId: userId as any,
    name,
    key,
  });

  return jsonResponse(
    {
      apiKey: key,
      message: `API key '${name}' created. Store this securely — it won't be shown again.`,
    },
    201
  );
});
