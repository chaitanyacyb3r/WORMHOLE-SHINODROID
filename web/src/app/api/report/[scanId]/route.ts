import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ scanId: string }> }
) {
    const { scanId } = await params;

    try {
        // Get auth token from Convex Auth
        const token = await convexAuthNextjsToken();
        if (token) {
            convex.setAuth(token);
        } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch report URLs (ownership check happens inside the query)
        const urls = await convex.query(api.storage.getReportUrl, {
            scanId: scanId as Id<"scans">,
        });

        if (!urls?.static) {
            return NextResponse.json({ error: "PDF not available for this scan" }, { status: 404 });
        }

        // Redirect to the storage URL
        return NextResponse.redirect(urls.static);
    } catch (error) {
        console.error("Failed to get report URL", error);
        return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }
}
