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

// ── JWT structure check ─────────────────────────────────────────────────
// Validates the token looks like a real JWT (3 base64url segments)
// This is NOT full cryptographic verification (Supabase handles that),
// but blocks trivial cookie forgery with garbage values.
function isValidJwtStructure(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Each part must be valid base64url (alphanumeric + - _ =)
    const base64urlRegex = /^[A-Za-z0-9_-]+=*$/;
    return parts.every((part) => part.length > 0 && base64urlRegex.test(part));
}

function getAuthToken(request: NextRequest): string | null {
    // Supabase stores auth as sb-<project>-auth-token or as chunked cookies
    // (sb-<project>-auth-token.0, sb-<project>-auth-token.1, etc.)
    const allCookies = request.cookies.getAll();

    // Try single cookie first
    const singleCookie = allCookies.find(
        (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    if (singleCookie?.value) return singleCookie.value;

    // Try chunked cookies (Supabase splits large tokens)
    const chunks = allCookies
        .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token."))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (chunks.length > 0) {
        return chunks.map((c) => c.value).join("");
    }

    return null;
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

    // ── Auth check with JWT structure validation ────────────────────────
    const token = getAuthToken(request);
    const hasValidAuth = token !== null && isValidJwtStructure(token);

    // Protect dashboard routes — redirect to login if no valid auth
    if (!hasValidAuth && pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from auth pages
    if (hasValidAuth && (pathname === "/login" || pathname === "/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};

