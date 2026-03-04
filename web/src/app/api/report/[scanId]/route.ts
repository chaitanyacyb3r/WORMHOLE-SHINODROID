import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ scanId: string }> }
) {
    const { scanId } = await params;
    if (!UUID_REGEX.test(scanId)) {
        return NextResponse.json({ error: "Invalid scan ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the scan and verify ownership
    const { data: scan, error: scanErr } = await supabase
        .from("scans")
        .select("id, user_id, report_url")
        .eq("id", scanId)
        .single();

    if (scanErr || !scan) {
        return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!scan.report_url) {
        return NextResponse.json({ error: "PDF not available for this scan" }, { status: 404 });
    }

    // report_url is stored as the storage path e.g. "user-id/reports/scan-id.pdf"
    const storagePath = scan.report_url;

    // Generate a signed URL valid for 60 minutes
    const { data: signedData, error: signErr } = await supabase
        .storage
        .from("apks")
        .createSignedUrl(storagePath, 3600);

    if (signErr || !signedData?.signedUrl) {
        console.error("Failed to create signed URL", signErr);
        return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }

    // Redirect the browser to the signed URL
    return NextResponse.redirect(signedData.signedUrl);
}
