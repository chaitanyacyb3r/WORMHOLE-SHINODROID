"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight, Github, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
        }
    }

    async function handleGithubSignup() {
        await supabase.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="card text-center max-w-md">
                    <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Mail size={28} style={{ color: "var(--success)" }} />
                    </div>
                    <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Check your email</h2>
                    <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                        We sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
                        Click the link to activate your account.
                    </p>
                    <Link href="/login" className="btn-secondary" style={{ textDecoration: "none" }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 relative">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]" style={{ background: "radial-gradient(circle, var(--gradient-end), transparent)" }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 no-underline mb-6">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}>
                            <Shield size={22} color="white" />
                        </div>
                        <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>ShinobiDroid</span>
                    </Link>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Create your account</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Start scanning APKs for free</p>
                </div>

                <div className="card">
                    <button onClick={handleGithubSignup} className="btn-secondary w-full flex items-center justify-center gap-3" style={{ marginBottom: "20px" }}>
                        <Github size={18} />
                        Sign up with GitHub
                    </button>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>OR</span>
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>

                    <form onSubmit={handleSignup} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className="input" style={{ paddingLeft: "44px" }} />
                            </div>
                        </div>

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
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} className="input" style={{ paddingLeft: "44px" }} />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2" style={{ marginTop: "4px" }}>
                            {loading ? "Creating account..." : <><span>Create Account</span><ArrowRight size={16} /></>}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
