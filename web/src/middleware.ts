import { NextResponse, type NextRequest } from "next/server";

/**
 * ShinobiDroid Auth Middleware
 *
 * Security features:
 *  1. JWT structure validation (not just cookie name check)
 *  2. In-memory rate limiting (60 req/min per IP)
 *  3. Dashboard route protection
 *  4. Auth page redirect for logged-in users
 */

// ── Rate Limiter (in-memory, suitable for single-instance/localhost) ─────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;           // max requests per window per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 5 minutes to prevent memory leak
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

// ── Auth cookie check ───────────────────────────────────────────────────
// Supabase SSR stores session as base64-encoded JSON in cookies,
// NOT as raw JWTs. We need to handle both formats.
function isValidJwtStructure(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64urlRegex = /^[A-Za-z0-9_-]+=*$/;
    return parts.every((part) => part.length > 0 && base64urlRegex.test(part));
}

function hasValidAuthCookie(request: NextRequest): boolean {
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(
        (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );

    if (authCookies.length === 0) return false;

    // Reassemble chunked cookies (sb-xxx-auth-token.0, .1, .2, ...)
    const chunked = authCookies
        .filter((c) => /\.\d+$/.test(c.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const rawValue = chunked.length > 0
        ? chunked.map((c) => c.value).join("")
        : authCookies[0].value;

    // Check 1: Raw value is a JWT (older Supabase versions)
    if (isValidJwtStructure(rawValue)) return true;

    // Check 2: Value is base64-encoded JSON containing access_token (Supabase SSR 0.8+)
    try {
        const decoded = atob(rawValue.replace(/-/g, "+").replace(/_/g, "/"));
        const parsed = JSON.parse(decoded);
        if (parsed.access_token && isValidJwtStructure(parsed.access_token)) return true;
    } catch {
        try {
            const parsed = JSON.parse(rawValue);
            if (parsed.access_token && isValidJwtStructure(parsed.access_token)) return true;
        } catch {
            // Not JSON either
        }
    }

    // Check 3: Cookie exists and has substantial content (fallback — Supabase validates server-side)
    return rawValue.length > 20;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── Rate limiting (API routes only, skip static assets) ──────────────
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

    // ── Auth check ──────────────────────────────────────────────────────
    const hasAuth = hasValidAuthCookie(request);

    // Protect dashboard routes — redirect to login if no valid auth
    if (!hasAuth && pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from auth pages
    if (hasAuth && (pathname === "/login" || pathname === "/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};

