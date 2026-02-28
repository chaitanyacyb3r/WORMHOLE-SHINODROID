"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, Key } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
    const [user, setUser] = useState<{ email: string; name: string } | null>(null);
    const [plan, setPlan] = useState("genin");
    const [scansUsed, setScansUsed] = useState(0);
    const supabase = createClient();

    const planLimits: Record<string, number> = { genin: 3, chunin: 25, jonin: 100, kage: 999 };
    const planNames: Record<string, string> = { genin: "Genin (Free)", chunin: "Chunin (Pro)", jonin: "Jonin (Team)", kage: "Kage (Enterprise)" };

    useEffect(() => {
        async function load() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser({ email: authUser.email || "", name: authUser.user_metadata?.full_name || "" });
                const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
                if (profile) {
                    setPlan(profile.plan);
                    setScansUsed(profile.scans_this_month);
                }
            }
        }
        load();
    }, [supabase]);

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Settings</h1>
                <p style={{ color: "var(--text-secondary)" }}>Manage your account and preferences</p>
            </div>

            <div className="max-w-2xl flex flex-col gap-6">
                {/* Profile */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <User size={20} style={{ color: "var(--accent)" }} />
                        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Profile</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-sm" style={{ color: "var(--text-muted)" }}>Name</label>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{user?.name || "—"}</p>
                        </div>
                        <div>
                            <label className="text-sm" style={{ color: "var(--text-muted)" }}>Email</label>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{user?.email || "—"}</p>
                        </div>
                    </div>
                </div>

                {/* Plan */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield size={20} style={{ color: "var(--accent)" }} />
                        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Plan</h3>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-medium gradient-text">{planNames[plan]}</p>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                {scansUsed} / {planLimits[plan]} scans this month
                            </p>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(scansUsed / planLimits[plan]) * 100}%` }} />
                    </div>
                </div>

                {/* API Key (placeholder) */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <Key size={20} style={{ color: "var(--accent)" }} />
                        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>API Access</h3>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                        API access is available on Chunin plan and above.
                    </p>
                    <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.875rem", opacity: plan === "genin" ? 0.5 : 1 }} disabled={plan === "genin"}>
                        Generate API Key
                    </button>
                </div>
            </div>
        </>
    );
}
