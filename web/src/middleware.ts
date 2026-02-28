import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight auth middleware that checks for session cookies locally
 * instead of making a network call to Supabase on every request.
 *
 * Why: The server-side fetch to Supabase is failing/timing out on this
 * machine, which blocked sign-in entirely. Cookie-based checks are instant
 * and work offline. The client-side Supabase SDK handles actual session
 * validation and refresh.
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for Supabase auth cookies — their presence indicates a session.
    // Supabase stores tokens in cookies prefixed with "sb-".
    // We check for the access token cookie specifically.
    const hasAuthCookie = request.cookies.getAll().some(
        (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

    // Protect dashboard routes — redirect to login if no auth cookie
    if (!hasAuthCookie && pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from auth pages
    if (hasAuthCookie && (pathname === "/login" || pathname === "/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup"],
};
