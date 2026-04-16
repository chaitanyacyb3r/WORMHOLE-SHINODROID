import { NextResponse, type NextRequest } from "next/server";
import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Shinodroid Auth Middleware (Convex Auth)
 *
 * IMPORTANT: Auth protection for /dashboard routes is handled CLIENT-SIDE
 * by the ConvexClientProvider + useConvexAuth() hook. The middleware only
 * handles cookie management (via convexAuthNextjsMiddleware) and rate limiting.
 *
 * This avoids the redirect loop problem where the middleware and client-side
 * auth checks disagree about the session state during the brief window
 * after signIn() but before cookies are fully synced.
 */

// ── Rate Limiter (in-memory, suitable for single-instance/localhost) ─────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;           // max requests per window per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of rateLimitMap) {
            if (now > val.resetAt) rateLimitMap.delete(key);
        }
    }, 5 * 60_000);
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

export default convexAuthNextjsMiddleware((request: NextRequest) => {
    const { pathname } = request.nextUrl;

    // ── Rate limiting (API routes + dashboard) ──────────────
    if (pathname.startsWith("/api/") || pathname.startsWith("/dashboard/")) {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "127.0.0.1";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }
    }

    // No auth redirects here — handled client-side to avoid redirect loops
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
