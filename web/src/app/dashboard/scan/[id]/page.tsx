"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Shield, Clock, CheckCircle, AlertTriangle, Download, ArrowLeft,
    FileText, Activity, Zap, Terminal, WifiOff, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Finding {
    id: string;
    title: string;
    severity: string;
    description: string;
    category: string;
    recommendation: string;
    owasp_category: string | null;
    owasp_masvs: string | null;
    engine: string;
}

// Engine display metadata — used for badge colors and labels
const ENGINE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    mobsf: { label: "MobSF", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: "🔍" },
    androwarn: { label: "Androwarn", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "⚡" },
    firebase: { label: "Firebase", color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🔥" },
    frida: { label: "Frida", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: "🛡️" },
    logcat: { label: "Logcat", color: "#34d399", bg: "rgba(52,211,153,0.12)", icon: "📋" },
};

function EngineBadge({ engine }: { engine: string }) {
    const meta = ENGINE_META[engine] || { label: engine, color: "#9ca3af", bg: "rgba(156,163,175,0.12)", icon: "🔧" };
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: meta.bg, color: meta.color }}>
            <span style={{ fontSize: "0.7rem" }}>{meta.icon}</span> {meta.label}
        </span>
    );
}

interface FridaScript {
    name: string;
    success: boolean;
    outputLines: number;
    output: string[];
    error?: string;
}

interface DynamicReport {
    timestamp?: string;
    device?: string;
    packageName?: string;
    skipped?: boolean;
    reason?: string;
    error?: string;
    pdfPath?: string | null;
    scripts?: FridaScript[];
    summary?: {
        totalScripts: number;
        scriptsRun: number;
        successful: number;
        sslBypasses: number;
        rootBypasses: number;
        cryptoOps: number;
        networkCalls: number;
        storageAccess: number;
        authEvents: number;
        platformIssues: number;
        resilienceBypasses: number;
        totalHooks: number;
        findingsExtracted: number;
    };
}

interface ScanData {
    id: string;
    file_name: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    file_size: number;
    findings_critical: number;
    findings_high: number;
    findings_medium: number;
    findings_low: number;
    findings_info: number;
    scan_type: string;
    report_url: string | null;
    dynamic_status: string | null;
    dynamic_report_json: DynamicReport | null;
    dynamic_completed_at: string | null;
    report_json: { security_score?: number; app_name?: string; package_name?: string; mobsf_hash?: string } | null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DynamicStatusBadge({ status }: { status: string | null }) {
    const cfg: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
        not_run: { color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: <WifiOff size={12} />, label: "Not Run" },
        pending: { color: "#60a5fa", bg: "rgba(59,130,246,0.1)", icon: <Clock size={12} />, label: "Pending" },
        running: { color: "#a78bfa", bg: "rgba(139,92,246,0.1)", icon: <Activity size={12} />, label: "Running" },
        completed: { color: "#34d399", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle size={12} />, label: "Completed" },
        skipped: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <AlertTriangle size={12} />, label: "Skipped" },
        failed: { color: "#f87171", bg: "rgba(239,68,68,0.1)", icon: <AlertTriangle size={12} />, label: "Failed" },
    };
    const s = cfg[status || "not_run"] || cfg.not_run;
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: s.bg, color: s.color }}>
            {s.icon} {s.label}
        </span>
    );
}

function FridaScriptCard({ script }: { script: FridaScript }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-primary)"
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Terminal size={16} style={{ color: script.success ? "var(--success)" : "var(--danger)" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{script.name}</span>
                    <span style={{
                        fontSize: "0.75rem", padding: "2px 8px", borderRadius: 999,
                        background: script.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        color: script.success ? "var(--success)" : "var(--danger)"
                    }}>
                        {script.success ? "✓ success" : script.error || "failed"}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{script.outputLines} lines</span>
                    {open ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                </div>
            </button>
            {open && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
                    {script.output.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No output captured.</p>
                    ) : (
                        <pre style={{
                            fontFamily: "monospace", fontSize: "0.75rem", lineHeight: 1.6,
                            color: "#a3e635", background: "#0a0a0f", padding: 12, borderRadius: 8,
                            overflowX: "auto", maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap"
                        }}>
                            {script.output.slice(0, 200).join("\n")}
                            {script.output.length > 200 && `\n... and ${script.output.length - 200} more lines`}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ScanDetailPage() {
    const params = useParams();
    const [scan, setScan] = useState<ScanData | null>(null);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "findings" | "dynamic">("overview");
    const [engineFilter, setEngineFilter] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        async function load() {
            const { data: scanData } = await supabase
                .from("scans").select("*").eq("id", params.id).single();
            if (scanData) {
                setScan(scanData);
                const { data: findingsData, error: findingsErr } = await supabase
                    .from("findings").select("*").eq("scan_id", params.id)
                    .order("severity_order", { ascending: false });
                if (findingsErr) {
                    console.error("Failed to fetch findings:", findingsErr.message);
                } else if (findingsData) {
                    setFindings(findingsData);
                }
            }
            setLoading(false);
        }
        load();

        const channel = supabase
            .channel(`scan-${params.id}`)
            .on("postgres_changes",
                { event: "UPDATE", schema: "public", table: "scans", filter: `id=eq.${params.id}` },
                (payload) => setScan(payload.new as ScanData))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [params.id, supabase]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-t-transparent mx-auto mb-4"
                        style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                    <p style={{ color: "var(--text-muted)" }}>Loading scan...</p>
                </div>
            </div>
        );
    }

    if (!scan) {
        return (
            <div className="card text-center py-12">
                <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: "var(--danger)" }} />
                <p style={{ color: "var(--text-primary)" }}>Scan not found</p>
            </div>
        );
    }

    const isScanning = scan.status === "pending" || scan.status === "scanning";
    const isDynamicRunning = scan.dynamic_status === "running" || scan.dynamic_status === "pending";
    const dynamicDone = scan.dynamic_status === "completed" || scan.dynamic_status === "failed" || scan.dynamic_status === "skipped";

    const severityCounts = [
        { label: "Critical", count: scan.findings_critical || 0, color: "#ef4444" },
        { label: "High", count: scan.findings_high || 0, color: "#f97316" },
        { label: "Medium", count: scan.findings_medium || 0, color: "#f59e0b" },
        { label: "Low", count: scan.findings_low || 0, color: "#3b82f6" },
        { label: "Info", count: scan.findings_info || 0, color: "#10b981" },
    ];
    const totalFindings = severityCounts.reduce((a, s) => a + s.count, 0);
    const dynReport = scan.dynamic_report_json;

    // Group findings by engine for display
    const engineGroups = findings.reduce<Record<string, Finding[]>>((acc, f) => {
        const eng = f.engine || "mobsf";
        if (!acc[eng]) acc[eng] = [];
        acc[eng].push(f);
        return acc;
    }, {});
    const activeEngines = Object.keys(engineGroups);
    const filteredFindings = engineFilter ? (engineGroups[engineFilter] || []) : findings;

    // Dynamic-specific findings (from frida, logcat engines)
    const dynamicEngines = ["frida", "logcat"];
    const dynamicFindings = findings.filter(f => dynamicEngines.includes(f.engine || ""));

    const TABS = [
        { id: "overview" as const, label: `Overview (${totalFindings})` },
        { id: "findings" as const, label: `All Findings (${totalFindings})` },
        { id: "dynamic" as const, label: `Dynamic (${dynamicFindings.length})`, badge: scan.dynamic_status },
    ];

    return (
        <>
            {/* Back */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium mb-6 no-underline"
                style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}>
                        <FileText size={22} color="white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{scan.file_name}</h1>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {new Date(scan.created_at).toLocaleString()} &bull; {(scan.file_size / 1024 / 1024).toFixed(1)} MB
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {scan.status === "completed" && (
                        <a href={`/api/report/${scan.id}`} target="_blank" rel="noopener noreferrer"
                            className="btn-secondary flex items-center gap-2"
                            style={{ padding: "8px 16px", fontSize: "0.875rem", textDecoration: "none" }}
                            title={scan.report_url ? "Download Static PDF Report" : "Open report in MobSF"}>
                            <Download size={16} /> {scan.report_url ? "Static PDF" : "View Report"}
                        </a>
                    )}
                    {scan.dynamic_report_json?.pdfPath && (
                        <a href={`/api/dynamic-report/${scan.id}`} target="_blank" rel="noopener noreferrer"
                            className="btn-secondary flex items-center gap-2"
                            style={{ padding: "8px 16px", fontSize: "0.875rem", textDecoration: "none", borderColor: "#a78bfa" }}
                            title="Download Dynamic Analysis PDF">
                            <Zap size={16} /> Dynamic PDF
                        </a>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{
                        background: isScanning ? "rgba(59,130,246,0.12)" : scan.status === "completed" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: isScanning ? "#60a5fa" : scan.status === "completed" ? "#34d399" : "#f87171",
                    }}>
                        {isScanning ? <Clock size={14} /> : scan.status === "completed" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                        {scan.status}
                    </span>
                </div>
            </div>

            {/* Scanning indicator */}
            {isScanning && (
                <div className="card mb-8" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(124,58,237,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
                    <div className="flex items-center gap-4">
                        <Activity size={24} style={{ color: "var(--info)" }} className="animate-pulse" />
                        <div>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>Analysis in progress...</p>
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Running MobSF, Androwarn, Firebase, Frida, Logcat — this page updates automatically</p>
                        </div>
                    </div>
                    <div className="progress-bar mt-4">
                        <div className="progress-fill" style={{ width: "60%", animation: "pulse 2s ease-in-out infinite" }} />
                    </div>
                </div>
            )}

            {/* Dynamic analysis in-progress banner */}
            {!isScanning && isDynamicRunning && (
                <div className="card mb-8" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05))", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <div className="flex items-center gap-4">
                        <Zap size={24} style={{ color: "#a78bfa" }} className="animate-pulse" />
                        <div>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>Dynamic analysis running (Frida)...</p>
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Installing APK on emulator and running Frida scripts. This takes 1-3 minutes.</p>
                        </div>
                    </div>
                    <div className="progress-bar mt-4">
                        <div className="progress-fill" style={{ width: "40%", background: "#a78bfa", animation: "pulse 2s ease-in-out infinite" }} />
                    </div>
                </div>
            )}

            {/* Main content */}
            {scan.status === "completed" && (
                <>
                    {/* Severity counts */}
                    <div className="grid grid-cols-5 gap-3 mb-8">
                        {severityCounts.map((s, i) => (
                            <div key={i} className="card text-center" style={{ padding: "16px" }}>
                                <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.count}</p>
                                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                        {TABS.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
                                    color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                                    border: activeTab === tab.id ? "1px solid var(--border)" : "1px solid transparent",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                                }}>
                                {tab.label}
                                {tab.badge && <DynamicStatusBadge status={tab.badge} />}
                            </button>
                        ))}
                    </div>

                    {/* ── Overview Tab ─────────────────────────────── */}
                    {activeTab === "overview" && (
                        <div className="card">
                            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Security Score</h3>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{
                                    background: `conic-gradient(${scan.findings_critical ? "var(--danger)" : "var(--success)"} ${Math.max(10, 100 - totalFindings * 2)}%, var(--bg-secondary) 0)`,
                                    boxShadow: "0 0 20px var(--accent-glow)"
                                }}>
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card)" }}>
                                        <span className="text-2xl font-bold" style={{ color: scan.findings_critical ? "var(--danger)" : "var(--success)" }}>
                                            {Math.max(0, 100 - (scan.findings_critical * 20) - (scan.findings_high * 10) - (scan.findings_medium * 5) - (scan.findings_low * 2))}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                                        {scan.findings_critical > 0 ? "Critical issues found" : scan.findings_high > 0 ? "High severity issues found" : "Looking good!"}
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                        {totalFindings} total findings{activeEngines.length > 0 ? ` across ${activeEngines.length} engine${activeEngines.length !== 1 ? "s" : ""}` : ""}
                                    </p>
                                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                        <DynamicStatusBadge status={scan.dynamic_status} />
                                        {dynReport?.summary && (
                                            <>
                                                <span style={{ fontSize: "0.75rem", color: "#f97316" }}>🔓 {dynReport.summary.sslBypasses} SSL bypasses</span>
                                                <span style={{ fontSize: "0.75rem", color: "#a78bfa" }}>🔑 {dynReport.summary.rootBypasses} root bypasses</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex rounded-lg overflow-hidden h-3">
                                {severityCounts.filter(s => s.count > 0).map((s, i) => (
                                    <div key={i} style={{ width: `${(s.count / Math.max(totalFindings, 1)) * 100}%`, background: s.color, minWidth: "4px" }} />
                                ))}
                            </div>

                            {/* Engine breakdown */}
                            {activeEngines.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Findings by Engine</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                                        {activeEngines.map(eng => {
                                            const meta = ENGINE_META[eng] || { label: eng, color: "#9ca3af", bg: "rgba(156,163,175,0.08)", icon: "🔧" };
                                            return (
                                                <div key={eng} style={{ padding: "10px 12px", borderRadius: 10, background: meta.bg, textAlign: "center" }}>
                                                    <p style={{ fontSize: "1.2rem", fontWeight: 700, color: meta.color }}>{engineGroups[eng].length}</p>
                                                    <p style={{ fontSize: "0.7rem", color: meta.color, marginTop: 2, fontWeight: 500 }}>{meta.icon} {meta.label}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Static Findings Tab ───────────────────────── */}
                    {activeTab === "findings" && (
                        <div className="flex flex-col gap-4">
                            {/* Engine filter bar */}
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setEngineFilter(null)}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                    style={{
                                        background: !engineFilter ? "var(--accent)" : "var(--bg-secondary)",
                                        color: !engineFilter ? "white" : "var(--text-muted)",
                                        border: "1px solid " + (!engineFilter ? "var(--accent)" : "var(--border)"),
                                        cursor: "pointer"
                                    }}>
                                    All ({totalFindings})
                                </button>
                                {activeEngines.map(eng => {
                                    const meta = ENGINE_META[eng] || { label: eng, color: "#9ca3af", bg: "rgba(156,163,175,0.12)", icon: "🔧" };
                                    return (
                                        <button key={eng}
                                            onClick={() => setEngineFilter(engineFilter === eng ? null : eng)}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                            style={{
                                                background: engineFilter === eng ? meta.bg : "var(--bg-secondary)",
                                                color: engineFilter === eng ? meta.color : "var(--text-muted)",
                                                border: "1px solid " + (engineFilter === eng ? meta.color : "var(--border)"),
                                                cursor: "pointer"
                                            }}>
                                            {meta.icon} {meta.label} ({engineGroups[eng].length})
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Findings list */}
                            {filteredFindings.length === 0 ? (
                                <div className="card text-center py-8">
                                    <Shield size={32} className="mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
                                    <p style={{ color: "var(--text-muted)" }}>No findings available</p>
                                </div>
                            ) : (
                                filteredFindings.map((f) => (
                                    <details key={f.id} className="card" style={{ padding: 0 }}>
                                        <summary className="flex items-center gap-3 cursor-pointer p-4 list-none" style={{ color: "var(--text-primary)" }}>
                                            <span className={`badge badge-${f.severity?.toLowerCase()}`}>{f.severity}</span>
                                            <span className="font-medium text-sm flex-1">{f.title}</span>
                                            <EngineBadge engine={f.engine || "mobsf"} />
                                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>{f.category}</span>
                                        </summary>
                                        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
                                            <p className="text-sm mt-3 mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
                                            {f.owasp_category && (
                                                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                                                    📋 <strong>OWASP:</strong> {f.owasp_category}
                                                    {f.owasp_masvs && <span className="ml-2">({f.owasp_masvs})</span>}
                                                </p>
                                            )}
                                            {f.recommendation && (
                                                <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                                                    <p className="text-xs font-medium mb-1" style={{ color: "var(--success)" }}>Recommendation</p>
                                                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.recommendation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── Dynamic Analysis Tab ──────────────────────── */}
                    {activeTab === "dynamic" && (
                        <div className="flex flex-col gap-4">
                            {/* Status card */}
                            <div className="card" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.04), rgba(59,130,246,0.04))", border: "1px solid rgba(139,92,246,0.15)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <Zap size={24} style={{ color: "#a78bfa" }} />
                                        <div>
                                            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Frida Dynamic Instrumentation</p>
                                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                                {dynReport?.device ? `Device: ${dynReport.device}` : "Emulator analysis"}
                                                {dynReport?.packageName ? ` — ${dynReport.packageName}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <DynamicStatusBadge status={scan.dynamic_status} />
                                </div>

                                {/* Summary stats */}
                                {dynReport?.summary && (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginTop: 16 }}>
                                        {[
                                            { label: "Scripts Run", value: `${dynReport.summary.scriptsRun}/${dynReport.summary.totalScripts}`, color: "#a78bfa" },
                                            { label: "SSL Bypasses", value: dynReport.summary.sslBypasses, color: "#f97316" },
                                            { label: "Root Bypasses", value: dynReport.summary.rootBypasses, color: "#f59e0b" },
                                            { label: "Crypto Ops", value: dynReport.summary.cryptoOps || 0, color: "#c084fc" },
                                            { label: "Network Calls", value: dynReport.summary.networkCalls || 0, color: "#38bdf8" },
                                            { label: "Storage Access", value: dynReport.summary.storageAccess || 0, color: "#fbbf24" },
                                            { label: "Auth Events", value: dynReport.summary.authEvents || 0, color: "#a78bfa" },
                                            { label: "Platform", value: dynReport.summary.platformIssues || 0, color: "#fb923c" },
                                            { label: "Resilience", value: dynReport.summary.resilienceBypasses || 0, color: "#f87171" },
                                            { label: "Total Hooks", value: dynReport.summary.totalHooks, color: "#60a5fa" },
                                            { label: "Findings", value: dynReport.summary.findingsExtracted, color: "#34d399" },
                                        ].map((stat, i) => (
                                            <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 8, background: "var(--bg-secondary)" }}>
                                                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: stat.color }}>{stat.value}</p>
                                                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Skipped / Failed state */}
                            {scan.dynamic_status === "skipped" && (
                                <div className="card text-center py-8" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
                                    <WifiOff size={36} className="mx-auto mb-3" style={{ color: "#f59e0b", opacity: 0.7 }} />
                                    <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>Dynamic analysis was skipped</p>
                                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{dynReport?.reason || "No Android emulator was connected when the scan ran."}</p>
                                    <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "12px 16px", textAlign: "left", maxWidth: 400, margin: "0 auto" }}>
                                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>To enable dynamic analysis:</p>
                                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: 16, lineHeight: 1.8 }}>
                                            <li>Run <code style={{ color: "#a78bfa" }}>.\setup-emulator.ps1</code> to launch the emulator</li>
                                            <li>Upload the APK again — the worker auto-detects it</li>
                                            <li>Frida scripts run automatically in the background</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {/* Not run state */}
                            {(!scan.dynamic_status || scan.dynamic_status === "not_run") && (
                                <div className="card text-center py-8">
                                    <Shield size={36} className="mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
                                    <p style={{ color: "var(--text-muted)" }}>Dynamic analysis data not available for this scan.</p>
                                </div>
                            )}

                            {/* Frida script output cards */}
                            {dynReport?.scripts && dynReport.scripts.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Script Output
                                    </h3>
                                    {dynReport.scripts.map((script, i) => (
                                        <FridaScriptCard key={i} script={script} />
                                    ))}
                                </div>
                            )}

                            {/* Dynamic findings */}
                            {dynamicFindings.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Dynamic Findings ({dynamicFindings.length})
                                    </h3>
                                    {dynamicFindings.map((f) => (
                                        <details key={f.id} className="card" style={{ padding: 0 }}>
                                            <summary className="flex items-center gap-3 cursor-pointer p-4 list-none" style={{ color: "var(--text-primary)" }}>
                                                <span className={`badge badge-${f.severity?.toLowerCase()}`}>{f.severity}</span>
                                                <span className="font-medium text-sm flex-1">{f.title}</span>
                                                {f.owasp_category && (
                                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}>
                                                        {f.owasp_category}
                                                    </span>
                                                )}
                                            </summary>
                                            <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
                                                <pre className="text-sm mt-3 mb-3 leading-relaxed" style={{
                                                    color: "var(--text-secondary)", fontFamily: "inherit",
                                                    whiteSpace: "pre-wrap", wordBreak: "break-word"
                                                }}>
                                                    {f.description}
                                                </pre>
                                                {f.recommendation && (
                                                    <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                                                        <p className="text-xs font-medium mb-1" style={{ color: "var(--success)" }}>Recommendation</p>
                                                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.recommendation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
