"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    }

    async function handleGithubLogin() {
        await supabase.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 relative">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]" style={{ background: "radial-gradient(circle, var(--gradient-start), transparent)" }} />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 no-underline mb-6">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}>
                            <Shield size={22} color="white" />
                        </div>
                        <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>ShinobiDroid</span>
                    </Link>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Welcome back</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Sign in to your account</p>
                </div>

                {/* Card */}
                <div className="card">
                    {/* GitHub login */}
                    <button onClick={handleGithubLogin} className="btn-secondary w-full flex items-center justify-center gap-3" style={{ marginBottom: "20px" }}>
                        <Github size={18} />
                        Continue with GitHub
                    </button>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>OR</span>
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="input" style={{ paddingLeft: "44px" }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required className="input" style={{ paddingLeft: "44px" }} />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2" style={{ marginTop: "4px" }}>
                            {loading ? "Signing in..." : <><span>Sign In</span><ArrowRight size={16} /></>}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-medium" style={{ color: "var(--accent)" }}>
                        Sign up free
                    </Link>
                </p>
            </div>
        </div>
    );
}
