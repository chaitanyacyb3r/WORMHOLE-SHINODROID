"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { TypeAnimation } from "react-type-animation";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { motion, useScroll, useSpring } from "framer-motion";
import AnimatedSection, { StaggerContainer, StaggerItem } from "./components/AnimatedSection";
import ParallaxSection, { ScaleOnScroll, SlideOnScroll } from "./components/ParallaxSection";

const StarField3D = dynamic(() => import("./components/StarField3D"), { ssr: false });
const HeroShield3D = dynamic(() => import("./components/HeroShield3D"), { ssr: false });
import {
  Shield,
  Zap,
  FileSearch,
  Lock,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Activity,
  Upload,
  Eye,
  FileText,
  CheckCircle2,
  X,
  Brain,
  Download,
  Github,
  Linkedin,
  Twitter,
} from "lucide-react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const problemCards = [
  {
    icon: <Lock size={24} />,
    iconGradient: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
    iconBorder: "rgba(239,68,68,0.25)",
    iconColor: "#f87171",
    title: "Hardcoded Secrets",
    desc: "AI assistants frequently embed API keys, tokens, and credentials directly in source code, leaving them exposed to anyone who decompiles the APK.",
    severity: "CRITICAL",
    severityColor: "#ef4444",
  },
  {
    icon: <Smartphone size={24} />,
    iconGradient: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))",
    iconBorder: "rgba(249,115,22,0.25)",
    iconColor: "#fb923c",
    title: "Insecure Storage",
    desc: "Sensitive user data stored in plaintext SharedPreferences or SQLite databases, accessible to any app on the device.",
    severity: "HIGH",
    severityColor: "#f97316",
  },
  {
    icon: <Shield size={24} />,
    iconGradient: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))",
    iconBorder: "rgba(124,58,237,0.25)",
    iconColor: "#a78bfa",
    title: "Missing Encryption",
    desc: "Network calls without SSL pinning or certificate validation, making the app vulnerable to man-in-the-middle attacks.",
    severity: "HIGH",
    severityColor: "#f97316",
  },
];

const steps = [
  {
    num: "01",
    title: "Upload",
    desc: "Drag & drop your APK file or browse from your device. Supported up to 200MB.",
    icon: <Upload size={32} />,
  },
  {
    num: "02",
    title: "Analyze",
    desc: "Our engine performs 50+ static and dynamic security checks automatically.",
    icon: <Eye size={32} />,
  },
  {
    num: "03",
    title: "Report",
    desc: "Get an AI-powered detailed report with prioritized fixes and code context.",
    icon: <FileText size={32} />,
  },
];

const featuresLarge = [
  {
    icon: <FileSearch size={28} />,
    title: "Static Analysis",
    desc: "Decompile & scan source code for vulnerabilities",
    items: [
      "Manifest analysis & component exposure detection",
      "Hardcoded secrets & credential scanning",
      "Cryptographic misuse identification",
      "Code quality & best practice validation",
    ],
  },
  {
    icon: <Activity size={28} />,
    title: "Dynamic Analysis",
    desc: "Runtime behavior with real device instrumentation",
    items: [
      "Frida instrumentation for runtime behavior",
      "Logcat output analysis & sensitive data detection",
      "Network traffic inspection",
      "Runtime permission usage monitoring",
    ],
  },
];

const featuresSmall = [
  {
    icon: <Brain size={20} />,
    title: "AI-Powered Reports",
    desc: "Intelligent remediation suggestions powered by MiniMax M2.7",
  },
  {
    icon: <Shield size={20} />,
    title: "OWASP Top 10",
    desc: "All findings mapped to OWASP Mobile Security standards",
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: "50+ Security Checks",
    desc: "Comprehensive coverage across all vulnerability categories",
  },
  {
    icon: <Download size={20} />,
    title: "Export & Share",
    desc: "Download as PDF or JSON. Share reports with your team.",
  },
];

const pricingPlans = [
  {
    name: "Hobby",
    price: { monthly: "Free", annual: "Free" },
    desc: "For individual developers getting started",
    features: [
      { text: "3 scans per month", included: true },
      { text: "Static analysis only", included: true },
      { text: "Basic security report", included: true },
      { text: "Community support", included: true },
      { text: "Dynamic analysis", included: false },
      { text: "AI-powered reports", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start Free",
    variant: "secondary" as const,
  },
  {
    name: "Professional",
    price: { monthly: "$29", annual: "$23" },
    desc: "For teams shipping production apps",
    popular: true,
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Static + Dynamic analysis", included: true },
      { text: "AI-powered reports", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
      { text: "Team sharing", included: true },
      { text: "CI/CD integration", included: true },
    ],
    cta: "Get Pro →",
    variant: "primary" as const,
  },
  {
    name: "Enterprise",
    price: { monthly: "$99", annual: "$79" },
    desc: "For organizations with compliance needs",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Team management", included: true },
      { text: "SSO / SAML", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom integrations", included: true },
      { text: "On-premise option", included: true },
    ],
    cta: "Contact Us",
    variant: "secondary" as const,
  },
];

const faqItems = [
  {
    q: "Is my APK data secure?",
    a: "Absolutely. Your APK is encrypted in transit and at rest, processed in an isolated sandbox environment, and automatically deleted after analysis is complete. We never share or distribute your application files.",
  },
  {
    q: "What types of vulnerabilities do you detect?",
    a: "We detect 50+ vulnerability types including hardcoded secrets, insecure data storage, improper cryptography, insecure network communication, client-side injection, and more. All findings are mapped to OWASP Mobile Top 10 and CWE identifiers.",
  },
  {
    q: "How long does analysis take?",
    a: "Static analysis typically completes in 2-5 minutes depending on APK size. Dynamic analysis adds another 3-8 minutes. Most scans complete within 10 minutes total.",
  },
  {
    q: "Can I integrate this into my CI/CD pipeline?",
    a: "Yes! Professional and Enterprise plans include REST API access. You can trigger scans, retrieve results, and set quality gates directly from your CI/CD workflow.",
  },
  {
    q: "What makes this different from MobSF?",
    a: "Shinodroid builds on MobSF's engine but adds AI-powered report generation, a beautiful SaaS interface, team collaboration, CI/CD integration, and managed infrastructure — so you don't need to self-host anything.",
  },
  {
    q: "How does the AI report generation work?",
    a: "After analysis completes, our AI engine (powered by MiniMax M2.7) reviews all findings, prioritizes them by actual risk, generates plain-English explanations, and provides specific code-level remediation steps.",
  },
];

const footerLinks = {
  Product: ["Features", "Pricing", "Changelog", "Security"],
  Resources: ["Docs", "Blog", "API Reference", "Status"],
  Company: ["About", "Contact", "Careers", "Legal"],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FAQ ITEM COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FAQItem({
  q,
  a,
  defaultOpen,
}: {
  q: string;
  a: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: open ? "var(--border-strong)" : "var(--border)",
        borderRadius: "var(--radius-base)",
        overflow: "hidden",
        transition: "border-color var(--duration-fast)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "var(--text-h5)",
          fontWeight: 500,
          textAlign: "left",
          lineHeight: 1.4,
        }}
      >
        {q}
        <ChevronDown
          size={18}
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
            marginLeft: "16px",
            transition: "transform var(--duration-fast)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? "300px" : "0px",
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition:
            "max-height var(--duration-normal) var(--ease-out), opacity var(--duration-fast)",
        }}
      >
        <p
          style={{
            padding: "0 24px 20px",
            color: "var(--text-secondary)",
            fontSize: "var(--text-body)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LANDING PAGE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <>
    {/* Scroll Progress Bar */}
    <motion.div
      style={{
        scaleX,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: "linear-gradient(90deg, #7c3aed, #ec4899, #3b82f6)",
        transformOrigin: "0%",
        zIndex: 9999,
      }}
    />
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-0)",
        position: "relative",
      }}
    >
      {/* 3D Starfield background */}
      <StarField3D />
      {/* ── 1. NAVIGATION BAR ─────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: "var(--container-2xl)",
          zIndex: 50,
          background: "rgba(10, 10, 20, 0.35)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--container-2xl)",
            margin: "0 auto",
            padding: "0 40px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <img
              src="/logo.png"
              alt="Shinodroid"
              width={32}
              height={32}
              style={{
                borderRadius: "var(--radius-sm)",
                objectFit: "contain",
              }}
            />
            <span
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "1.125rem",
              }}
            >
              Shinodroid
            </span>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
            }}
          >
            {["Features", "Pricing", "Docs"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-body-sm)",
                  textDecoration: "none",
                  fontWeight: 500,
                  transition: "color var(--duration-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
              >
                {link}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/login"
              style={{
                padding: "8px 18px",
                fontSize: "var(--text-body-sm)",
                color: "var(--text-secondary)",
                textDecoration: "none",
                borderRadius: "var(--radius-sm)",
                transition:
                  "background var(--duration-fast), color var(--duration-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-3)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-primary"
              style={{
                padding: "8px 20px",
                fontSize: "var(--text-body-sm)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Start Free <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO ─────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "64px",
          zIndex: 1,
        }}
      >
        {/* Blackhole video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            top: "-340px",
            left: 0,
            width: "100%",
            height: "calc(100% + 340px)",
            objectFit: "cover",
            transform: "rotate(180deg)",
            zIndex: 0,
            opacity: 0.5,
          }}
        >
          <source src="/videos/blackhole.webm" type="video/webm" />
        </video>
        {/* Scanning line overlay */}
        <div
          className="animate-scan-line"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(59, 130, 246, 0.3), transparent)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        <div
          className="animate-fade-in-up"
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "0 24px",
            textAlign: "center",
            position: "relative",
            zIndex: 10,
          }}
        >
          <h1
            style={{
              fontSize: "var(--text-display)",
              fontWeight: "var(--text-display-weight)" as unknown as number,
              lineHeight: "var(--text-display-lh)",
              letterSpacing: "var(--text-display-ls)",
              color: "var(--text-primary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            <TypeAnimation
              sequence={[
                "Your AI-Built App",
                500,
              ]}
              wrapper="span"
              speed={50}
              cursor={false}
              repeat={0}
            />
            <br />
            Isn&apos;t{" "}
            <span
              className="gradient-text animate-gradient-shift"
              style={{
                backgroundSize: "200% 200%",
              }}
            >Safe</span>{" "}Yet.
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--text-body-lg-lh)",
              maxWidth: "600px",
              margin: "0 auto",
              marginBottom: "var(--space-xl)",
            }}
          >
            Automated security analysis for Android apps built with AI. Upload
            your APK. Get a comprehensive security report in minutes.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "var(--space-lg)",
            }}
          >
            <Link
              href="/signup"
              className="btn-primary animate-glow-pulse"
              style={{
                padding: "14px 32px",
                fontSize: "1rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 600,
              }}
            >
              🔍 Analyze Your First APK — Free
            </Link>
            <a
              href="#features"
              className="btn-secondary"
              style={{
                padding: "14px 32px",
                fontSize: "1rem",
                textDecoration: "none",
              }}
            >
              ▶ Watch Demo
            </a>
          </div>

          {/* Social proof — animated counters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "40px",
              flexWrap: "wrap",
              marginTop: "var(--space-xl)",
            }}
          >
            {[
              { end: 2000, suffix: "+", label: "Developers" },
              { end: 50, suffix: "+", label: "Security Checks" },
              { end: 500, suffix: "K+", label: "Vulns Found" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)" }}>
                  <CountUp end={stat.end} duration={2.5} enableScrollSpy scrollSpyOnce />
                  <span style={{ fontSize: "20px" }}>{stat.suffix}</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.05em", marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div
            style={{
              marginTop: "var(--space-2xl)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <ChevronDown
              size={20}
              className="animate-float"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
            />
          </div>
        </div>
      </section>

      {/* ── 2b. ENCRYPTION SECTION ────────────────────── */}
      <AnimatedSection direction="scale">
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          padding: "var(--space-3xl) 24px",
        }}
      >
        <HeroShield3D />
      </section>
      </AnimatedSection>

      {/* ── 3. PROBLEM STATEMENT ─────────────────────── */}
      <AnimatedSection direction="up">
      <section
        style={{
          padding: "var(--space-4xl) 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 14px",
              borderRadius: "var(--radius-xs)",
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "var(--warning-bg)",
              color: "var(--warning-text)",
              border: "1px solid var(--warning-border)",
              marginBottom: "var(--space-base)",
            }}
          >
            ⚠️ The Problem
          </span>

          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              lineHeight: "var(--text-h2-lh)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-primary)",
              marginBottom: "var(--space-2xl)",
            }}
          >
            AI Writes Code Fast.
            <br />
            It Also Writes Vulnerabilities Fast.
          </h2>

          <StaggerContainer
            staggerDelay={0.15}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "var(--space-lg)",
            }}
          >
            {problemCards.map((card, i) => (
              <StaggerItem key={i} direction="up">
              <div
                style={{
                  background: "var(--surface-2)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-xl)",
                  textAlign: "left",
                  transition:
                    "border-color var(--duration-fast), box-shadow var(--duration-fast), transform 0.15s ease",
                  cursor: "default",
                  transformStyle: "preserve-3d",
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  e.currentTarget.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.02)`;
                  e.currentTarget.style.borderColor = "var(--danger-border)";
                  e.currentTarget.style.boxShadow = "var(--glow-danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "var(--radius-lg)",
                    background: card.iconGradient,
                    border: `1px solid ${card.iconBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.iconColor,
                    marginBottom: "var(--space-base)",
                    boxShadow: `0 0 20px ${card.iconBorder}`,
                  }}
                >
                  {card.icon}
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-h5)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: "var(--space-base)",
                  }}
                >
                  {card.desc}
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "var(--text-overline)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    background: `${card.severityColor}18`,
                    color: card.severityColor,
                    border: `1px solid ${card.severityColor}33`,
                  }}
                >
                  {card.severity}
                </span>
              </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 4. HOW IT WORKS ──────────────────────────── */}
      <AnimatedSection direction="up" delay={0.1}>
      <section
        style={{ padding: "var(--space-4xl) 24px", position: "relative", zIndex: 1, overflow: "hidden" }}
      >
        {/* Skills video background */}
        <video
          autoPlay muted loop playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.25,
            zIndex: 0,
          }}
        >
          <source src="/videos/skills-bg.webm" type="video/webm" />
        </video>
        <div style={{ maxWidth: "1080px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 14px",
              borderRadius: "var(--radius-xs)",
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "rgba(124, 58, 237, 0.08)",
              color: "var(--accent)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              marginBottom: "var(--space-base)",
            }}
          >
            ⚙️ How It Works
          </span>

          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              lineHeight: "var(--text-h2-lh)",
              color: "var(--text-primary)",
              marginBottom: "var(--space-3xl)",
            }}
          >
            From APK to Full Security Report
            <br />
            in 3 Steps
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-2xl)",
              alignItems: "start",
            }}
          >
            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-base)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-h1)",
                    fontWeight: 700,
                    color: "var(--accent)",
                    opacity: 0.15,
                    lineHeight: 1,
                  }}
                >
                  {s.num}
                </span>
                <div
                  className="animate-float"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  {s.icon}
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-h4)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    maxWidth: "280px",
                  }}
                >
                  {s.desc}
                </p>

                {/* Connector line (except last) */}
                {i < 2 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "96px",
                      right: "-24px",
                      width: "48px",
                      height: "2px",
                      borderTop: "2px dashed var(--border)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 5. FEATURES BENTO GRID ───────────────────── */}
      <AnimatedSection direction="up">
      <section
        id="features"
        style={{ padding: "var(--space-4xl) 24px", position: "relative", zIndex: 1 }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 14px",
              borderRadius: "var(--radius-xs)",
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "rgba(124, 58, 237, 0.08)",
              color: "var(--accent)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              marginBottom: "var(--space-base)",
            }}
          >
            ✨ Features
          </span>

          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              color: "var(--text-primary)",
              marginBottom: "var(--space-2xl)",
            }}
          >
            Everything You Need to
            <br />
            Ship Secure Android Apps
          </h2>

          {/* Row 1: 2 large cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--space-lg)",
              marginBottom: "var(--space-lg)",
            }}
          >
            {featuresLarge.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-xl)",
                  textAlign: "left",
                  minHeight: "280px",
                  transition:
                    "border-color var(--duration-fast), box-shadow var(--duration-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    color: "var(--accent)",
                    marginBottom: "var(--space-base)",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-h5)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-lg)",
                  }}
                >
                  {f.desc}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {f.items.map((item, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "var(--text-body-sm)",
                        color: "var(--text-secondary)",
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--accent)",
                          flexShrink: 0,
                        }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Row 2: 4 small cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "var(--space-lg)",
            }}
          >
            {featuresSmall.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-lg)",
                  textAlign: "left",
                  minHeight: "200px",
                  transition:
                    "border-color var(--duration-fast), box-shadow var(--duration-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    color: "var(--accent)",
                    marginBottom: "var(--space-base)",
                  }}
                >
                  {f.icon}
                </div>
                <h4
                  style={{
                    fontSize: "var(--text-h5)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  {f.title}
                </h4>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 6. REPORT PREVIEW ────────────────────────── */}
      <ScaleOnScroll>
      <section
        style={{ padding: "var(--space-4xl) 24px", position: "relative", zIndex: 1 }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              color: "var(--text-primary)",
              marginBottom: "var(--space-2xl)",
            }}
          >
            See What Your Report Looks Like
          </h2>

          {/* Report mockup */}
          <div style={{ perspective: "1200px", marginBottom: "var(--space-xl)" }}>
            <div
              style={{
                maxWidth: "900px",
                margin: "0 auto",
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                transform: "rotateY(-2deg) rotateX(1deg)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.4), 0 0 40px rgba(124,58,237,0.08)",
                overflow: "hidden",
              }}
            >
              {/* Title bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>Shinodroid Security Report — com.example.app</span>
              </div>
              {/* Report content */}
              <div style={{ padding: "24px 28px" }}>
                {/* Score header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Security Score</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 36, fontWeight: 800, color: "#f59e0b" }}>42</span>
                      <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{l:"Critical",n:3,c:"#ef4444"},{l:"High",n:7,c:"#f97316"},{l:"Medium",n:12,c:"#f59e0b"},{l:"Info",n:5,c:"#3b82f6"}].map(v => (
                      <div key={v.l} style={{ textAlign: "center", padding: "8px 14px", borderRadius: "var(--radius-base)", background: `${v.c}10`, border: `1px solid ${v.c}25` }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: v.c }}>{v.n}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{v.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Vulnerability rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { sev: "CRITICAL", c: "#ef4444", name: "Hardcoded AWS Access Key", loc: "BuildConfig.java:42" },
                    { sev: "HIGH", c: "#f97316", name: "Insecure SharedPreferences", loc: "UserPrefs.kt:18" },
                    { sev: "HIGH", c: "#f97316", name: "SSL Pinning Not Implemented", loc: "NetworkModule.java:91" },
                    { sev: "MEDIUM", c: "#f59e0b", name: "Debug Mode Enabled", loc: "AndroidManifest.xml:3" },
                  ].map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-base)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: `${v.c}15`, color: v.c, border: `1px solid ${v.c}30`, letterSpacing: "0.05em" }}>{v.sev}</span>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>{v.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{v.loc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Annotation callouts */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "var(--space-base)",
              flexWrap: "wrap",
            }}
          >
            {[
              { icon: <Brain size={14} />, label: "AI-Powered Insights" },
              { icon: <FileSearch size={14} />, label: "Code-Level Context" },
              { icon: <Activity size={14} />, label: "CVSS Scoring" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass"
                style={{
                  padding: "10px 20px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-caption)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "var(--accent)" }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>
      </ScaleOnScroll>

      {/* ── 7. PRICING ───────────────────────────────── */}
      <AnimatedSection direction="up">
      <section
        id="pricing"
        style={{ padding: "var(--space-4xl) 24px", position: "relative", zIndex: 1 }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 14px",
              borderRadius: "var(--radius-xs)",
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "rgba(124, 58, 237, 0.08)",
              color: "var(--accent)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              marginBottom: "var(--space-base)",
            }}
          >
            💎 Pricing
          </span>

          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              color: "var(--text-primary)",
              marginBottom: "var(--space-base)",
            }}
          >
            Start Free. Scale When Ready.
          </h2>

          {/* Billing toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-full)",
              padding: "4px",
              marginBottom: "var(--space-2xl)",
            }}
          >
            {(["monthly", "annual"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setBilling(period)}
                style={{
                  padding: "8px 24px",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition:
                    "background var(--duration-fast), color var(--duration-fast)",
                  background:
                    billing === period ? "var(--accent)" : "transparent",
                  color:
                    billing === period
                      ? "#fff"
                      : "var(--text-secondary)",
                }}
              >
                {period === "monthly" ? "Monthly" : "Annual — Save 20%"}
              </button>
            ))}
          </div>

          {/* Pricing cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-lg)",
              alignItems: "start",
            }}
          >
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  position: "relative",
                  background: plan.popular
                    ? "var(--surface-3)"
                    : "var(--surface-2)",
                  border: plan.popular
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-xl)",
                  textAlign: "left",
                  transform: plan.popular ? "scale(1.03)" : "none",
                  boxShadow: plan.popular ? "var(--glow-md)" : "none",
                  zIndex: plan.popular ? 1 : 0,
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-14px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background:
                        "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                      color: "#fff",
                      fontSize: "var(--text-overline)",
                      fontWeight: 600,
                      padding: "4px 18px",
                      borderRadius: "var(--radius-full)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <h3
                  style={{
                    fontSize: "var(--text-h5)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-lg)",
                  }}
                >
                  {plan.desc}
                </p>

                <div
                  style={{
                    marginBottom: "var(--space-lg)",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-h2)",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {plan.price[billing]}
                  </span>
                  {plan.price[billing] !== "Free" && (
                    <span
                      style={{
                        fontSize: "var(--text-body)",
                        color: "var(--text-muted)",
                      }}
                    >
                      /mo
                    </span>
                  )}
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border-subtle)",
                    margin: "0 0 var(--space-lg)",
                  }}
                />

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    marginBottom: "var(--space-xl)",
                  }}
                >
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 0",
                        fontSize: "var(--text-body-sm)",
                        color: f.included
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                      }}
                    >
                      {f.included ? (
                        <CheckCircle2
                          size={16}
                          style={{ color: "var(--success)", flexShrink: 0 }}
                        />
                      ) : (
                        <X
                          size={16}
                          style={{ color: "var(--text-muted)", flexShrink: 0 }}
                        />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === "Enterprise" ? "#" : "/signup"}
                  className={
                    plan.variant === "primary"
                      ? "btn-primary"
                      : "btn-secondary"
                  }
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 24px",
                    textDecoration: "none",
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 600,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 8. FAQ ────────────────────────────────────── */}
      <AnimatedSection direction="up">
      <section
        style={{ padding: "var(--space-4xl) 24px", position: "relative", zIndex: 1 }}
      >
        <div style={{ maxWidth: "768px", margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              color: "var(--text-primary)",
              marginBottom: "var(--space-2xl)",
            }}
          >
            Frequently Asked Questions
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              textAlign: "left",
            }}
          >
            {faqItems.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} defaultOpen={i === 1} />
            ))}
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 9. FINAL CTA ─────────────────────────────── */}
      <AnimatedSection direction="up">
      <section
        style={{
          padding: "var(--space-4xl) 24px",
          position: "relative",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* Gradient bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(124, 58, 237, 0.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px),
              linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            opacity: 0.03,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: "var(--text-h2-weight)" as unknown as number,
              color: "var(--text-primary)",
              marginBottom: "var(--space-base)",
            }}
          >
            Don&apos;t Ship Vulnerable Apps.
          </h2>
          <p
            style={{
              fontSize: "var(--text-body-lg)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "var(--space-xl)",
            }}
          >
            Join 2,000+ developers who trust Shinodroid to catch security issues
            before their users do.
          </p>
          <Link
            href="/signup"
            className="btn-primary animate-glow-pulse"
            style={{
              padding: "14px 36px",
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
            }}
          >
            🔍 Start Your Free Security Scan
          </Link>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "var(--text-caption)",
              marginTop: "var(--space-base)",
            }}
          >
            No credit card required · 3 free scans · 30s setup
          </p>
        </div>
      </section>
      </AnimatedSection>

      {/* ── 10. FOOTER ────────────────────────────────── */}
      <footer
        style={{
          background: "var(--surface-1)",
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-3xl) 40px var(--space-xl)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--container-2xl)",
            margin: "0 auto",
          }}
        >
          {/* Top row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-3xl)",
              flexWrap: "wrap",
              marginBottom: "var(--space-xl)",
            }}
          >
            {/* Logo & tagline */}
            <div style={{ maxWidth: "260px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "var(--space-sm)",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Shinodroid"
                  width={28}
                  height={28}
                  style={{
                    borderRadius: "var(--radius-sm)",
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  Shinodroid
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-caption)",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                AI-powered Android security analysis by WORMHOLE Security
              </p>
            </div>

            {/* Link columns */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-3xl)",
                flexWrap: "wrap",
              }}
            >
              {Object.entries(footerLinks).map(([title, links]) => (
                <div key={title}>
                  <h4
                    style={{
                      fontSize: "var(--text-overline)",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {title}
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {links.map((link) => (
                      <li key={link} style={{ marginBottom: "8px" }}>
                        <a
                          href="#"
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "var(--text-body-sm)",
                            textDecoration: "none",
                            transition: "color var(--duration-fast)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color =
                              "var(--text-primary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--text-secondary)")
                          }
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "var(--border-subtle)",
              marginBottom: "var(--space-lg)",
            }}
          />

          {/* Bottom row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-base)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-caption)",
                color: "var(--text-muted)",
              }}
            >
              © 2026 WORMHOLE Security
            </span>

            <div style={{ display: "flex", gap: "var(--space-base)" }}>
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    color: "var(--text-muted)",
                    transition: "color var(--duration-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>

            <div style={{ display: "flex", gap: "var(--space-base)" }}>
              {["Privacy", "Terms"].map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "var(--text-caption)",
                    textDecoration: "none",
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <p
            style={{
              textAlign: "center",
              fontSize: "var(--text-caption)",
              color: "var(--text-muted)",
              marginTop: "var(--space-lg)",
            }}
          >
            Built with 🛡️ for the AI-first developer generation
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}
