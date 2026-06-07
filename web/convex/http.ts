import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { ciGetUploadUrl, ciScanUpload, ciScanStatus, ciCreateApiKey } from "./cicd";

const http = httpRouter();

// Convex Auth HTTP routes (handles OAuth callbacks, token refresh, etc.)
auth.addHttpRoutes(http);

// ── CI/CD API Routes ─────────────────────────────────────────────────────────
// These are public HTTP endpoints authenticated via API keys (not Convex Auth).

// GET /api/v1/ci-upload-url — Get a presigned upload URL
http.route({
  path: "/api/v1/ci-upload-url",
  method: "GET",
  handler: ciGetUploadUrl,
});
http.route({
  path: "/api/v1/ci-upload-url",
  method: "OPTIONS",
  handler: ciGetUploadUrl,
});

// POST /api/v1/ci-scan — Start a scan after uploading
http.route({
  path: "/api/v1/ci-scan",
  method: "POST",
  handler: ciScanUpload,
});
http.route({
  path: "/api/v1/ci-scan",
  method: "OPTIONS",
  handler: ciScanUpload,
});

// GET /api/v1/ci-scan/:scanId — Poll scan status and get results
// Note: Convex HTTP routes don't support path params, so we use a wildcard path
// The handler parses the scan ID from the URL path.
http.route({
  pathPrefix: "/api/v1/ci-scan/",
  method: "GET",
  handler: ciScanStatus,
});
http.route({
  pathPrefix: "/api/v1/ci-scan/",
  method: "OPTIONS",
  handler: ciScanStatus,
});

// POST /api/v1/ci-api-keys — Create a new API key (admin only)
http.route({
  path: "/api/v1/ci-api-keys",
  method: "POST",
  handler: ciCreateApiKey,
});
http.route({
  path: "/api/v1/ci-api-keys",
  method: "OPTIONS",
  handler: ciCreateApiKey,
});

export default http;
