import Link from "next/link";
import {
  Shield,
  Zap,
  FileSearch,
  Lock,
  ChevronRight,
  Terminal,
  Smartphone,
  Activity,
} from "lucide-react";

const features = [
  {
    icon: <FileSearch size={22} />,
    title: "Static Analysis",
    desc: "Source code review, permission auditing, manifest analysis, and cryptographic weakness detection.",
    color: "#7c3aed",
  },
  {
    icon: <Activity size={22} />,
    title: "Dynamic Analysis",
    desc: "Runtime instrumentation with Frida — SSL pinning bypass, root detection bypass, and API hooking.",
    color: "#ec4899",
  },
  {
    icon: <Lock size={22} />,
    title: "SSL Pinning Bypass",
    desc: "30+ bypass methods covering OkHTTP, TrustManager, Conscrypt, Flutter, and custom implementations.",
    color: "#10b981",
  },
  {
    icon: <Smartphone size={22} />,
    title: "OWASP MASVS",
    desc: "Findings mapped to OWASP Mobile Application Security Verification Standard for compliance.",
    color: "#f59e0b",
  },
  {
    icon: <Terminal size={22} />,
    title: "PDF Reports",
    desc: "Professional reports with executive summary, severity breakdown, CVSS scores, and fix guides.",
    color: "#3b82f6",
  },
  {
    icon: <Shield size={22} />,
    title: "Secure by Design",
    desc: "APKs processed in isolated environments. Encrypted at rest. Auto-deleted after 24 hours.",
    color: "#ef4444",
  },
];

const steps = [
  { num: "01", title: "Upload", desc: "Drag and drop your APK file" },
  { num: "02", title: "Scan", desc: "Static + dynamic analysis runs automatically" },
  { num: "03", title: "Report", desc: "Get findings with fix recommendations" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 50,
          background: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div
              style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}
            >
              <Shield size={16} color="white" />
            </div>
            <span className="font-bold" style={{ color: "var(--text-primary)", fontSize: "1rem" }}>
              ShinobiDroid
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ padding: "7px 18px", fontSize: "0.85rem", textDecoration: "none" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary"
              style={{ padding: "7px 18px", fontSize: "0.85rem", textDecoration: "none" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", paddingTop: "140px", paddingBottom: "100px" }}>
        {/* Background glow — centered, subtle */}
        <div

          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            opacity: 0.12,
            filter: "blur(120px)",
            background: "radial-gradient(circle, var(--gradient-start), transparent 70%)",
          }}
        />

        <div style={{ maxWidth: "768px", margin: "0 auto", padding: "0 24px", textAlign: "center", position: "relative", zIndex: 10 }}>
          {/* Pill badge */}
          <div

            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              color: "var(--accent-hover)",
              marginBottom: "32px",
            }}
          >
            <Zap size={12} />
            AUTOMATED ANDROID PENTESTING
          </div>

          {/* Title */}
          <h1 style={{ marginBottom: "16px", lineHeight: 1.1 }}>
            <span className="gradient-text" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800 }}>
              ShinobiDroid
            </span>
            <br />
            <span style={{ color: "var(--text-primary)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800 }}>
              忍ドロイド
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1.1rem",
              lineHeight: 1.7,
              maxWidth: "520px",
              margin: "0 auto 40px",
            }}
          >
            Upload your APK. Get a complete security report in minutes.
            Static analysis, dynamic instrumentation, SSL pinning bypass —
            all automated.
          </p>

          {/* CTA buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              className="btn-primary"
              style={{
                padding: "13px 32px",
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Start Scanning Free <ChevronRight size={16} />
            </Link>
            <Link
              href="#features"
              className="btn-secondary"
              style={{ padding: "13px 32px", fontSize: "0.95rem", textDecoration: "none" }}
            >
              How It Works
            </Link>
          </div>

          {/* Trust line */}
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "24px" }}>
            Free tier · 3 scans/month · No credit card required
          </p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: "1024px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "10px" }}>
              Industry-Grade Analysis
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Everything you need to secure your Android application
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="card"
                style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "28px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: `${f.color}12`,
                    color: f.color,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 600 }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "896px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "56px" }}>
            Three Steps to Secure
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "48px",
            }}
          >
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
                <span className="gradient-text" style={{ fontSize: "2.5rem", fontWeight: 900 }}>
                  {s.num}
                </span>
                <h3 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700 }}>
                  {s.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 24px",
          background: "linear-gradient(180deg, var(--bg-primary), var(--bg-secondary))",
        }}
      >
        <div style={{ maxWidth: "512px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "14px" }}>
            Ready to secure your app?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "32px" }}>
            Start scanning for free. No credit card required.
          </p>
          <Link
            href="/signup"
            className="btn-primary"
            style={{
              padding: "14px 40px",
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Get Started Free <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer

        style={{ marginTop: "auto", padding: "20px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
      >
        <div style={{ maxWidth: "1024px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            &copy; 2026 WORMHOLE Security
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            ShinobiDroid 忍ドロイド v1.0
          </span>
        </div>
      </footer>
    </div>
  );
}
