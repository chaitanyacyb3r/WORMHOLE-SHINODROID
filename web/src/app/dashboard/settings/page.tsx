"use client";

import { User, Shield, Key, ArrowUpRight, CheckCircle2, Crown, Zap } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Design Tokens
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const glass: React.CSSProperties = {
  background: "rgba(15, 15, 25, 0.55)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(124, 58, 237, 0.12)",
  borderRadius: "var(--radius-lg)",
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  })
};

export default function SettingsPage() {
    const user = useQuery(api.users.viewer);
    const scans = useQuery(api.scans.list);

    const plan = "genin"; // TODO: Add plan field to user schema if needed
    const scansUsed = scans?.length ?? 0;

    const planLimits: Record<string, number> = { genin: 10, chunin: 50, jonin: 250, kage: 9999 };
    const planNames: Record<string, string> = { genin: "Genin (Free)", chunin: "Chunin (Pro)", jonin: "Jonin (Team)", kage: "Kage (Enterprise)" };

    const usagePercent = Math.min(100, (scansUsed / planLimits[plan]) * 100);

    return (
        <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeInUp} custom={0} style={{ marginBottom: "var(--space-2xl)" }}>
                <h1 
                  style={{ 
                    fontSize: "var(--text-h2)", 
                    fontWeight: 700, 
                    color: "var(--text-primary)", 
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em"
                  }}
                >
                  Settings
                </h1>
                <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                  Configure your security profile and subscription
                </p>
            </motion.div>

            <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
                
                {/* Profile Card */}
                <motion.div variants={fadeInUp} custom={1} style={{ ...glass, padding: "var(--space-xl)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-xl)" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "12px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={20} style={{ color: "var(--accent)" }} />
                        </div>
                        <h3 style={{ fontSize: "var(--text-h5)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Account Information</h3>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-xl)" }}>
                        <div>
                            <label style={{ fontSize: "var(--text-overline)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Display Name</label>
                            <div style={{ ...glass, background: "rgba(255,255,255,0.02)", padding: "12px 16px", color: "var(--text-primary)", fontWeight: 500 }}>
                                {user?.name || "Anonymous Shinobi"}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "var(--text-overline)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Email Address</label>
                            <div style={{ ...glass, background: "rgba(255,255,255,0.02)", padding: "12px 16px", color: "var(--text-primary)", fontWeight: 500 }}>
                                {user?.email || "—"}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Plan Card */}
                <motion.div variants={fadeInUp} custom={2} style={{ ...glass, padding: "var(--space-xl)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -10, right: -10, opacity: 0.03 }}>
                       <Crown size={180} />
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-xl)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Shield size={20} style={{ color: "#10b981" }} />
                            </div>
                            <h3 style={{ fontSize: "var(--text-h5)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Subscription Plan</h3>
                        </div>
                        <span style={{ 
                          fontSize: "var(--text-caption)", fontWeight: 700, padding: "4px 12px", borderRadius: "var(--radius-full)",
                          background: "var(--accent-gradient)", color: "white", boxShadow: "0 0 15px rgba(124,58,237,0.3)"
                        }}>
                           CURRENT: {plan.toUpperCase()}
                        </span>
                    </div>

                    <div style={{ marginBottom: "var(--space-xl)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                            <div>
                                <p style={{ fontSize: "var(--text-h4)", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{planNames[plan]}</p>
                                <p style={{ fontSize: "var(--text-body-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
                                    Your monthly usage quota Reset in 12 days
                                </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: "var(--text-body-sm)", color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>{scansUsed} / {planLimits[plan]}</p>
                                <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", margin: 0 }}>scans utilized</p>
                            </div>
                        </div>
                        
                        <div style={{ height: 10, borderRadius: 5, background: "rgba(0,0,0,0.3)", padding: 2, border: "1px solid rgba(255,255,255,0.05)" }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${usagePercent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                style={{ 
                                  height: "100%", borderRadius: 3, 
                                  background: "linear-gradient(90deg, var(--accent), var(--gradient-end))",
                                  boxShadow: "0 0 15px rgba(124,58,237,0.4)"
                                }} 
                            />
                        </div>
                    </div>

                    <button className="btn-secondary" style={{ width: "100%", padding: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        Upgrade Plan <ArrowUpRight size={16} />
                    </button>
                </motion.div>

                {/* API Access Card */}
                <motion.div variants={fadeInUp} custom={3} style={{ ...glass, padding: "var(--space-xl)", background: "rgba(124,58,237,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-lg)" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "12px", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Key size={20} style={{ color: "#f59e0b" }} />
                        </div>
                        <h3 style={{ fontSize: "var(--text-h5)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>API Access</h3>
                    </div>
                    
                    <div style={{ ...glass, padding: "var(--space-lg)", background: "rgba(0,0,0,0.2)", borderStyle: "dashed", textAlign: "center" }}>
                      <Zap size={24} style={{ color: "#f59e0b", opacity: 0.5, marginBottom: 12 }} />
                      <p style={{ fontSize: "var(--text-body-sm)", color: "var(--text-secondary)", margin: "0 auto", maxWidth: 400 }}>
                          Automate your security workflow by integrating Shinodroid into your CI/CD pipeline. 
                          API access requires a <strong style={{ color: "var(--accent)" }}>Chunin</strong> plan or higher.
                      </p>
                      <button 
                        style={{ marginTop: 20, padding: "8px 24px", fontSize: "var(--text-body-sm)", fontWeight: 700, cursor: "pointer", opacity: 0.6 }} 
                        className="btn-secondary"
                        disabled
                      >
                          Generate API Key
                      </button>
                    </div>
                </motion.div>

                <motion.div variants={fadeInUp} custom={4} style={{ textAlign: "center", marginTop: "var(--space-xl)" }}>
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
                    Shinodroid 2.7.0-Cloud | AI Engine: minimax-m2.7:cloud
                  </p>
                </motion.div>

            </div>
        </motion.div>
    );
}
