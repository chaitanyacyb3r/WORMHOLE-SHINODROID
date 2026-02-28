"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Shield, AlertTriangle, Clock, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Scan {
    id: string;
    file_name: string;
    status: string;
    created_at: string;
    findings_critical: number;
    findings_high: number;
    findings_medium: number;
    findings_low: number;
}

export default function DashboardPage() {
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const supabase = createClient();

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Shinobi");
            }

            const { data } = await supabase
                .from("scans")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

            if (data) setScans(data);
            setLoading(false);
        }
        load();
    }, [supabase]);

    const stats = {
        total: scans.length,
        completed: scans.filter((s) => s.status === "completed").length,
        pending: scans.filter((s) => s.status === "pending" || s.status === "scanning").length,
        totalFindings: scans.reduce((acc, s) => acc + (s.findings_critical || 0) + (s.findings_high || 0) + (s.findings_medium || 0) + (s.findings_low || 0), 0),
    };

    function formatDate(d: string) {
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function statusBadge(status: string) {
        const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
            completed: { bg: "rgba(16,185,129,0.12)", color: "#34d399", icon: <CheckCircle size={12} /> },
            scanning: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", icon: <Clock size={12} /> },
            pending: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", icon: <Clock size={12} /> },
            failed: { bg: "rgba(239,68,68,0.12)", color: "#f87171", icon: <AlertTriangle size={12} /> },
        };
        const s = map[status] || map.pending;
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
                {s.icon} {status}
            </span>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    Welcome back, {userName} 🥷
                </h1>
                <p style={{ color: "var(--text-secondary)" }}>Here&apos;s your security scanning overview</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Scans", value: stats.total, icon: <FileText size={20} />, color: "#7c3aed" },
                    { label: "Completed", value: stats.completed, icon: <CheckCircle size={20} />, color: "#10b981" },
                    { label: "In Progress", value: stats.pending, icon: <Clock size={20} />, color: "#3b82f6" },
                    { label: "Findings", value: stats.totalFindings, icon: <AlertTriangle size={20} />, color: "#f59e0b" },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: "20px" }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                        <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Quick action */}
            <Link href="/dashboard/scan" className="card flex items-center gap-4 mb-8 no-underline animate-pulse-glow" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))", border: "1px solid rgba(124,58,237,0.3)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}>
                    <Upload size={22} color="white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Start a New Scan</h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload an APK for automated security analysis</p>
                </div>
                <ArrowRight size={20} style={{ color: "var(--accent)" }} />
            </Link>

            {/* Recent scans */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Recent Scans</h2>
                    {scans.length > 0 && (
                        <Link href="/dashboard/reports" className="text-sm font-medium no-underline" style={{ color: "var(--accent)" }}>
                            View all
                        </Link>
                    )}
                </div>

                {loading ? (
                    <div className="card text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>
                ) : scans.length === 0 ? (
                    <div className="card text-center py-12">
                        <Shield size={40} className="mx-auto mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
                        <p className="mb-1 font-medium" style={{ color: "var(--text-secondary)" }}>No scans yet</p>
                        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Upload your first APK to get started</p>
                        <Link href="/dashboard/scan" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 24px", fontSize: "0.875rem" }}>
                            <Upload size={16} /> Upload APK
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {scans.map((scan) => (
                            <Link key={scan.id} href={`/dashboard/scan/${scan.id}`} className="card no-underline flex items-center gap-4" style={{ padding: "16px 20px" }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
                                    <FileText size={18} style={{ color: "var(--accent)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{scan.file_name}</p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(scan.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {scan.status === "completed" && (
                                        <div className="flex items-center gap-1.5">
                                            {scan.findings_critical > 0 && <span className="badge-critical badge">{scan.findings_critical}</span>}
                                            {scan.findings_high > 0 && <span className="badge-high badge">{scan.findings_high}</span>}
                                            {scan.findings_medium > 0 && <span className="badge-medium badge">{scan.findings_medium}</span>}
                                        </div>
                                    )}
                                    {statusBadge(scan.status)}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
