"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = [".apk"];

export default function NewScanPage() {
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    function validateFile(f: File): string | null {
        if (!ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))) {
            return "Only .apk files are allowed";
        }
        if (f.size > MAX_FILE_SIZE) {
            return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
        }
        // Check APK magic bytes (PK zip header)
        return null;
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const f = e.dataTransfer.files[0];
        if (f) {
            const err = validateFile(f);
            if (err) { setError(err); return; }
            setFile(f);
            setError("");
        }
    }, []);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) {
            const err = validateFile(f);
            if (err) { setError(err); return; }
            setFile(f);
            setError("");
        }
    }

    async function handleUpload() {
        if (!file) return;
        setUploading(true);
        setProgress(5);
        setError("");

        const MAX_RETRIES = 3;
        const UPLOAD_TIMEOUT_MS = 120_000; // 2 min — enough for 100MB on slow connection

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Step 1: Read file locally (fast)
            setProgress(10);
            const arrayBuffer = await file.arrayBuffer();
            const fileBytes = new Uint8Array(arrayBuffer);
            if (fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4b) {
                throw new Error("Invalid APK file (not a valid ZIP/APK format)");
            }

            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const timestamp = Date.now();
            const storagePath = `${user.id}/${timestamp}_${safeName}`;

            setProgress(25);

            // Step 2: Upload with timeout + retry
            let lastUploadError: Error | null = null;
            let uploaded = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

                try {
                    // Simulate progress advancing while upload is in progress
                    const progressInterval = setInterval(() => {
                        setProgress(p => Math.min(p + 1, 62));
                    }, 800);

                    const { error: uploadError } = await supabase.storage
                        .from("apks")
                        .upload(storagePath, file, {
                            contentType: "application/vnd.android.package-archive",
                            upsert: attempt > 1, // upsert on retry to overwrite partial upload
                        });

                    clearInterval(progressInterval);
                    clearTimeout(timeout);

                    if (uploadError) throw new Error(uploadError.message);
                    uploaded = true;
                    break;
                } catch (err: unknown) {
                    clearTimeout(timeout);
                    const isAbort = err instanceof Error && err.name === "AbortError";
                    const msg = isAbort ? `Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s` : (err instanceof Error ? err.message : "Upload failed");
                    lastUploadError = new Error(`Attempt ${attempt}: ${msg}`);

                    if (attempt < MAX_RETRIES) {
                        // Exponential backoff: 3s, 6s, 12s
                        const delay = 3000 * Math.pow(2, attempt - 1);
                        setError(`Upload failed, retrying in ${delay / 1000}s... (${attempt}/${MAX_RETRIES})`);
                        await new Promise(r => setTimeout(r, delay));
                        setError("");
                    }
                }
            }

            if (!uploaded) throw lastUploadError ?? new Error("Upload failed after all retries");

            setProgress(65);

            // Step 3: Create scan record — also needs timeout+retry (connection may drop after upload)
            let scan: { id: string } | null = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                // Advance progress while waiting for insert
                const insertProgressInterval = setInterval(() => {
                    setProgress(p => Math.min(p + 1, 93));
                }, 600);

                try {
                    const insertPromise = supabase.from("scans").insert({
                        user_id: user.id,
                        file_name: file.name,
                        file_path: storagePath,
                        file_size: file.size,
                        status: "pending",
                    }).select().single();

                    // Race insert against a 30s timeout
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("Insert timed out after 30s")), 30_000)
                    );

                    const { data, error: scanError } = await Promise.race([insertPromise, timeoutPromise]) as Awaited<typeof insertPromise>;

                    clearInterval(insertProgressInterval);
                    if (scanError) throw new Error(scanError.message);
                    scan = data;
                    break;
                } catch (err: unknown) {
                    clearInterval(insertProgressInterval);
                    const msg = err instanceof Error ? err.message : "Insert failed";

                    if (attempt < MAX_RETRIES) {
                        const delay = 3000 * Math.pow(2, attempt - 1);
                        setError(`Connection dropped, retrying in ${delay / 1000}s... (${attempt}/${MAX_RETRIES})`);
                        await new Promise(r => setTimeout(r, delay));
                        setError("");
                        setProgress(65);
                    } else {
                        throw new Error(`Failed to create scan job: ${msg}. Your APK was uploaded — please try again.`);
                    }
                }
            }

            if (!scan) throw new Error("Scan record not created");

            setProgress(100);

            // Redirect to scan status page
            setTimeout(() => {
                router.push(`/dashboard/scan/${scan!.id}`);
            }, 500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Upload failed";
            setError(message);
            setUploading(false);
            setProgress(0);
        }
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>New Scan</h1>
                <p style={{ color: "var(--text-secondary)" }}>Upload an Android APK for automated security analysis</p>
            </div>

            <div className="max-w-2xl">
                {/* Dropzone */}
                {!file ? (
                    <div
                        className={`dropzone ${dragActive ? "active" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-input")?.click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".apk"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Upload size={48} className="mx-auto mb-4 opacity-40" style={{ color: "var(--accent)" }} />
                        <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                            Drag and drop your APK here
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            or click to browse • Max 100MB • .apk files only
                        </p>
                    </div>
                ) : (
                    /* File selected */
                    <div className="card">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                                <FileText size={22} style={{ color: "var(--success)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{file.name}</p>
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                            </div>
                            {!uploading && (
                                <button onClick={() => { setFile(null); setProgress(0); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Progress */}
                        {uploading && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                        {progress < 30 ? "Preparing..." : progress < 60 ? "Uploading APK..." : progress < 100 ? "Creating scan job..." : "Done!"}
                                    </span>
                                    <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>{progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Analysis info */}
                        <div className="p-4 rounded-xl mb-6" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Engines that will analyze your APK:</p>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { name: "MobSF Static Analysis", desc: "Permissions, manifest, source code, crypto, secrets", icon: "🔍" },
                                    { name: "Androwarn Behavior Detection", desc: "12 categories of malicious behavior patterns", icon: "⚡" },
                                    { name: "Firebase Misconfiguration", desc: "Open databases, exposed storage, API key leaks", icon: "🔥" },
                                    { name: "Frida Dynamic Instrumentation", desc: "SSL pinning, root detection, runtime hooks", icon: "🛡️" },
                                    { name: "Logcat Leak Detection", desc: "Passwords, tokens, PII leaked to system logs", icon: "📋" },
                                ].map((tool, i) => (
                                    <div key={i} className="flex items-center gap-3 py-1.5" style={{ color: "var(--text-secondary)" }}>
                                        <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>{tool.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tool.name}</span>
                                            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{tool.desc}</span>
                                        </div>
                                        <CheckCircle size={13} style={{ color: "var(--success)" }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upload button */}
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            style={{ padding: "14px" }}
                        >
                            {uploading ? (
                                progress === 100 ? "Redirecting..." : "Uploading..."
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Start Security Scan
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 mt-4 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle size={18} style={{ color: "var(--danger)" }} />
                        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
                    </div>
                )}

                {/* Security note */}
                <div className="flex items-start gap-3 mt-6 p-4 rounded-xl" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                    <div>
                        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Your APK is secure</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Files are encrypted in transit and at rest. Only you can access your scan results.
                            APKs are automatically deleted after 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
