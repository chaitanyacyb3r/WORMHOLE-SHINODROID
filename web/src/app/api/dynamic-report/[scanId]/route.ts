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

    // Verify auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch scan and verify ownership
    const { data: scan, error: scanErr } = await supabase
        .from("scans")
        .select("id, user_id, dynamic_report_json")
        .eq("id", scanId)
        .single();

    if (scanErr || !scan) {
        return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }
    if (scan.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfPath = scan.dynamic_report_json?.pdfPath;
    if (!pdfPath) {
        return NextResponse.json({ error: "Dynamic PDF not available for this scan" }, { status: 404 });
    }

    // Generate a signed URL (60 min)
    const { data: signedData, error: signErr } = await supabase
        .storage
        .from("apks")
        .createSignedUrl(pdfPath, 3600);

    if (signErr || !signedData?.signedUrl) {
        console.error("Failed to create signed URL for dynamic PDF", signErr);
        return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.redirect(signedData.signedUrl);
}
