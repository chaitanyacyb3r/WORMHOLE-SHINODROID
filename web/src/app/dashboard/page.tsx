"use client";

import Link from "next/link";
import {
  Upload,
  Shield,
  TrendingUp,
  FileText,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

/* ═══════════════════════════════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════════════════════════════ */

const glass: React.CSSProperties = {
  background: "rgba(15, 15, 25, 0.55)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(124, 58, 237, 0.12)",
  borderRadius: "var(--radius-lg)",
};

/* ═══════════════════════════════════════════════════════════════════
   Framer Motion Variants
   ═══════════════════════════════════════════════════════════════════ */

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const rowStagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

/* ═══════════════════════════════════════════════════════════════════
   3D Tilt Card
   ═══════════════════════════════════════════════════════════════════ */

function TiltCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ref.current.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 10}deg) rotateX(${(y - 0.5) * -10}deg) scale(1.02)`;
    ref.current.style.boxShadow =
      "0 20px 40px rgba(124,58,237,0.18), 0 0 60px rgba(124,58,237,0.06)";
    ref.current.style.borderColor = "rgba(124,58,237,0.28)";
    setGlow({ x: x * 100, y: y * 100 });
  }

  function onLeave() {
    if (!ref.current) return;
    ref.current.style.transform =
      "perspective(800px) rotateY(0) rotateX(0) scale(1)";
    ref.current.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
    ref.current.style.borderColor = "rgba(124,58,237,0.12)";
    setGlow({ x: 50, y: 50 });
  }

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        ...glass,
        padding: "var(--space-lg)",
        position: "relative",
        overflow: "hidden",
        transition:
          "transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        cursor: "default",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(124,58,237,0.12), transparent 60%)`,
          pointerEvents: "none",
          transition: "background 0.2s ease",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const scans = useQuery(api.scans.list);
  const user = useQuery(api.users.viewer);
  const loading = scans === undefined;

  const userName = user?.name || user?.email?.split("@")[0] || "Shinobi";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { ref: chartRef, inView: chartInView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });

  /* ── Computed stats ── */
  const completedScans =
    scans?.filter((s) => s.status === "completed") ?? [];
  const stats = {
    total: scans?.length ?? 0,
    completed: completedScans.length,
    pending:
      scans?.filter(
        (s) => s.status === "pending" || s.status === "scanning"
      ).length ?? 0,
    critical:
      scans?.reduce((acc, s) => acc + (s.findingsCritical || 0), 0) ?? 0,
    high: scans?.reduce((acc, s) => acc + (s.findingsHigh || 0), 0) ?? 0,
    medium:
      scans?.reduce((acc, s) => acc + (s.findingsMedium || 0), 0) ?? 0,
    low: scans?.reduce((acc, s) => acc + (s.findingsLow || 0), 0) ?? 0,
  };
  const totalFindings =
    stats.critical + stats.high + stats.medium + stats.low;

  const avgScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((acc, s) => {
            const findings =
              (s.findingsCritical || 0) * 10 +
              (s.findingsHigh || 0) * 5 +
              (s.findingsMedium || 0) * 2 +
              (s.findingsLow || 0);
            return acc + Math.max(0, 100 - findings);
          }, 0) / completedScans.length
        )
      : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  function formatDate(ts: number) {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.round(diff / 86400000)} days ago`;
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getScoreGrade(score: number) {
    if (score >= 90) return { grade: "A", color: "#10b981" };
    if (score >= 75) return { grade: "B", color: "#22d3ee" };
    if (score >= 60) return { grade: "C", color: "#f59e0b" };
    if (score >= 40) return { grade: "D", color: "#f97316" };
    return { grade: "F", color: "#ef4444" };
  }

  function getScanScore(scan: {
    findingsCritical: number;
    findingsHigh: number;
    findingsMedium: number;
    findingsLow: number;
  }) {
    const findings =
      (scan.findingsCritical || 0) * 10 +
      (scan.findingsHigh || 0) * 5 +
      (scan.findingsMedium || 0) * 2 +
      (scan.findingsLow || 0);
    return Math.max(0, Math.min(100, 100 - findings));
  }

  /* ── Empty state ── */
  if (!loading && (scans?.length ?? 0) === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            ...glass,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-lg)",
          }}
        >
          <Shield
            size={36}
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
          />
        </div>
        <h2
          style={{
            fontSize: "var(--text-h3)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-sm)",
          }}
        >
          No scans performed yet
        </h2>
        <p
          style={{
            fontSize: "var(--text-body)",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-xl)",
            maxWidth: 400,
          }}
        >
          Upload your first APK to get a comprehensive security analysis with
          AI-powered insights.
        </p>
        <Link
          href="/dashboard/scan"
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            fontSize: "var(--text-body)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Upload size={18} /> Start New Scan
        </Link>
      </motion.div>
    );
  }

  /* ── Donut chart segments ── */
  const donutData = [
    { label: "Critical", value: stats.critical, color: "#ef4444" },
    { label: "High", value: stats.high, color: "#f97316" },
    { label: "Medium", value: stats.medium, color: "#f59e0b" },
    { label: "Low", value: stats.low, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  let donutOffset = 0;
  const donutSegments = donutData.map((seg) => {
    const pct = totalFindings > 0 ? (seg.value / totalFindings) * 100 : 0;
    const segment = { ...seg, pct, offset: donutOffset };
    donutOffset += pct;
    return segment;
  });

  const scoreGrade = getScoreGrade(avgScore);

  return (
    <>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <h1
          style={{
            fontSize: "var(--text-h2)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-xs)",
          }}
        >
          {greeting}, {userName} 👋
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-body)",
          }}
        >
          Here&apos;s your security scanning overview
        </p>
      </motion.div>

      {/* ── Stats Row — 3D Tilt Cards with CountUp ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={mounted ? "visible" : "hidden"}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        {/* Total Scans */}
        <TiltCard>
          <p
            style={{
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-sm)",
            }}
          >
            Total Scans
          </p>
          <p
            style={{
              fontSize: "var(--text-h1)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1,
              marginBottom: "var(--space-xs)",
            }}
          >
            {loading ? (
              "—"
            ) : (
              <CountUp end={stats.total} duration={1.8} useEasing preserveValue />
            )}
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "var(--text-caption)",
              color: "#10b981",
            }}
          >
            <TrendingUp size={12} /> +{stats.completed} completed
          </span>
        </TiltCard>

        {/* Avg Score — Animated Ring */}
        <TiltCard>
          <p
            style={{
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-sm)",
            }}
          >
            Avg Score
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-base)",
            }}
          >
            <div style={{ position: "relative", width: 60, height: 60 }}>
              <svg
                viewBox="0 0 36 36"
                style={{ width: 60, height: 60, transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(124,58,237,0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={loading ? "rgba(124,58,237,0.1)" : scoreGrade.color}
                  strokeWidth="4"
                  strokeDasharray={`${mounted ? (avgScore / 100) * 88 : 0} 88`}
                  strokeLinecap="round"
                  style={{
                    transition:
                      "stroke-dasharray 1.5s cubic-bezier(0.22,1,0.36,1) 0.3s, stroke 0.5s ease",
                    filter:
                      mounted && !loading
                        ? `drop-shadow(0 0 6px ${scoreGrade.color}60)`
                        : "none",
                  }}
                />
              </svg>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-body)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {loading ? (
                  "—"
                ) : (
                  <CountUp
                    end={avgScore}
                    duration={1.8}
                    delay={0.3}
                    useEasing
                    preserveValue
                  />
                )}
              </span>
            </div>
            <span
              style={{
                fontSize: "var(--text-body-sm)",
                color: "var(--text-secondary)",
              }}
            >
              /100
            </span>
          </div>
        </TiltCard>

        {/* Critical Issues */}
        <TiltCard>
          <p
            style={{
              fontSize: "var(--text-overline)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-sm)",
            }}
          >
            Critical Issues
          </p>
          <p
            style={{
              fontSize: "var(--text-h1)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1,
              marginBottom: "var(--space-xs)",
            }}
          >
            {loading ? (
              "—"
            ) : (
              <CountUp end={stats.critical} duration={1.5} useEasing preserveValue />
            )}
          </p>
          {stats.critical > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: "var(--text-caption)",
                color: "#ef4444",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 8px #ef444480",
                }}
              />
              Needs attention
            </span>
          )}
        </TiltCard>
      </motion.div>

      {/* ── Main Grid: Table + Right Panel ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        {/* ── Recent Scans Table ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          transition={{ delay: 0.3 }}
          style={{ ...glass, overflow: "hidden" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-lg)",
              borderBottom: "1px solid rgba(124,58,237,0.08)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--text-h5)",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Recent Scans
            </h2>
            <Link
              href="/dashboard/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: "var(--text-body-sm)",
                fontWeight: 500,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 0.8fr 2fr 1fr 1fr",
              gap: 8,
              padding: "10px var(--space-lg)",
              borderBottom: "1px solid rgba(124,58,237,0.06)",
            }}
          >
            {["APP NAME", "SCORE", "VULNERABILITIES", "DATE", "STATUS"].map(
              (h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "var(--text-overline)",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </span>
              )
            )}
          </div>

          {/* Rows */}
          {loading ? (
            <div
              style={{
                padding: "var(--space-3xl)",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading...
            </div>
          ) : (
            scans!.slice(0, 5).map((scan, i) => {
              const score = getScanScore(scan);
              const grade = getScoreGrade(score);
              const totalVuln =
                (scan.findingsCritical || 0) +
                (scan.findingsHigh || 0) +
                (scan.findingsMedium || 0) +
                (scan.findingsLow || 0);
              const isCompleted = scan.status === "completed";

              return (
                <motion.div
                  key={scan._id}
                  custom={i}
                  variants={rowStagger}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={`/dashboard/scan/${scan._id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 0.8fr 2fr 1fr 1fr",
                      gap: 8,
                      padding: "14px var(--space-lg)",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(124,58,237,0.06)",
                      textDecoration: "none",
                      transition:
                        "all 0.25s cubic-bezier(0.22,1,0.36,1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(124,58,237,0.06)";
                      e.currentTarget.style.transform =
                        "translateY(-1px) scale(1.005)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform =
                        "translateY(0) scale(1)";
                    }}
                  >
                    {/* App name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>📦</span>
                      <span
                        style={{
                          fontSize: "var(--text-body-sm)",
                          color: "var(--text-primary)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {scan.fileName}
                      </span>
                    </div>

                    {/* Score badge */}
                    <div>
                      {isCompleted ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "var(--text-caption)",
                            fontWeight: 700,
                            background: `${grade.color}18`,
                            color: grade.color,
                            border: `1px solid ${grade.color}33`,
                          }}
                        >
                          {score} ({grade.grade})
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "var(--text-body-sm)",
                            color: "var(--text-muted)",
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>

                    {/* Vulnerability bar */}
                    <div>
                      {isCompleted && totalVuln > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            height: 8,
                            borderRadius: 4,
                            overflow: "hidden",
                            background: "rgba(124,58,237,0.08)",
                            width: "100%",
                          }}
                        >
                          {scan.findingsCritical > 0 && (
                            <div
                              style={{
                                width: `${(scan.findingsCritical / totalVuln) * 100}%`,
                                background: "#ef4444",
                              }}
                            />
                          )}
                          {scan.findingsHigh > 0 && (
                            <div
                              style={{
                                width: `${(scan.findingsHigh / totalVuln) * 100}%`,
                                background: "#f97316",
                              }}
                            />
                          )}
                          {scan.findingsMedium > 0 && (
                            <div
                              style={{
                                width: `${(scan.findingsMedium / totalVuln) * 100}%`,
                                background: "#f59e0b",
                              }}
                            />
                          )}
                          {scan.findingsLow > 0 && (
                            <div
                              style={{
                                width: `${(scan.findingsLow / totalVuln) * 100}%`,
                                background: "#3b82f6",
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            height: 8,
                            borderRadius: 4,
                            background: "rgba(124,58,237,0.08)",
                          }}
                        />
                      )}
                    </div>

                    {/* Date */}
                    <span
                      style={{
                        fontSize: "var(--text-body-sm)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(scan._creationTime)}
                    </span>

                    {/* Status */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "var(--text-caption)",
                        fontWeight: 500,
                        color:
                          scan.status === "completed"
                            ? "#10b981"
                            : scan.status === "scanning"
                              ? "#3b82f6"
                              : scan.status === "failed"
                                ? "#ef4444"
                                : "#f59e0b",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "currentColor",
                        }}
                      />
                      {scan.status.charAt(0).toUpperCase() +
                        scan.status.slice(1)}
                    </span>
                  </Link>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* ── Right Panel ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
          }}
        >
          {/* Vulnerability Distribution — Animated Donut */}
          <motion.div
            variants={fadeRight}
            style={{ ...glass, padding: "var(--space-lg)" }}
          >
            <h3
              style={{
                fontSize: "var(--text-h5)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--space-lg)",
              }}
            >
              Vulnerability Distribution
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
              }}
            >
              <div
                style={{ position: "relative", width: 120, height: 120 }}
              >
                <svg
                  viewBox="0 0 42 42"
                  style={{ width: 120, height: 120 }}
                >
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549431"
                    fill="none"
                    stroke="rgba(124,58,237,0.08)"
                    strokeWidth="5"
                  />
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="21"
                      cy="21"
                      r="15.91549431"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="5"
                      strokeDasharray={`${mounted ? seg.pct : 0} ${mounted ? 100 - seg.pct : 100}`}
                      strokeDashoffset={
                        mounted ? 100 - seg.offset + 25 : 125
                      }
                      strokeLinecap="round"
                      style={{
                        transition: `stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.15}s, stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.15}s`,
                        filter: `drop-shadow(0 0 4px ${seg.color}40)`,
                      }}
                    />
                  ))}
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-h3)",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    <CountUp
                      end={totalFindings}
                      duration={1.5}
                      preserveValue
                    />
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-caption)",
                      color: "var(--text-muted)",
                    }}
                  >
                    total
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {[
                  {
                    label: "Critical",
                    value: stats.critical,
                    color: "#ef4444",
                  },
                  { label: "High", value: stats.high, color: "#f97316" },
                  {
                    label: "Medium",
                    value: stats.medium,
                    color: "#f59e0b",
                  },
                  { label: "Low", value: stats.low, color: "#3b82f6" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "var(--text-body-sm)",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: item.color,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${item.color}40`,
                      }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        marginLeft: "auto",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={fadeRight}
            style={{ ...glass, padding: "var(--space-lg)" }}
          >
            <h3
              style={{
                fontSize: "var(--text-h5)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--space-base)",
              }}
            >
              Quick Actions
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {[
                {
                  icon: <Upload size={16} />,
                  label: "Upload New APK",
                  href: "/dashboard/scan",
                },
                {
                  icon: <FileText size={16} />,
                  label: "View Latest Report",
                  href: "/dashboard/reports",
                },
                {
                  icon: <BarChart3 size={16} />,
                  label: "View All Trends",
                  href: "/dashboard/reports",
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(124,58,237,0.08)";
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {action.icon}
                  {action.label}
                  <ArrowUpRight
                    size={12}
                    style={{ marginLeft: "auto", opacity: 0.5 }}
                  />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Usage Meter */}
          <motion.div
            variants={fadeRight}
            style={{ ...glass, padding: "var(--space-lg)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-sm)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(124,58,237,0.12)",
                }}
              >
                Free Plan
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--text-body-sm)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-sm)",
              }}
            >
              {stats.total} of 10 scans used
            </p>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(124,58,237,0.08)",
                overflow: "hidden",
                marginBottom: "var(--space-base)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background:
                    "linear-gradient(90deg, var(--accent), var(--gradient-end))",
                  width: mounted
                    ? `${Math.min(100, (stats.total / 10) * 100)}%`
                    : "0%",
                  transition:
                    "width 1.2s cubic-bezier(0.22,1,0.36,1) 0.8s",
                  boxShadow: "0 0 12px rgba(124,58,237,0.3)",
                }}
              />
            </div>
            <button
              className="btn-secondary"
              style={{
                width: "100%",
                padding: "8px 16px",
                fontSize: "var(--text-body-sm)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Upgrade to Pro
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Security Score Trend — Animated Bar Chart ── */}
      <motion.div
        ref={chartRef}
        variants={fadeUp}
        initial="hidden"
        animate={mounted ? "visible" : "hidden"}
        transition={{ delay: 0.5 }}
        style={{ ...glass, padding: "var(--space-lg)" }}
      >
        <h2
          style={{
            fontSize: "var(--text-h5)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-lg)",
          }}
        >
          Security Score Trend
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 120,
            padding: "0 var(--space-sm)",
          }}
        >
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (day, i) => {
              const heights = [60, 55, 65, 62, 68, 75, 78];
              const isToday = i === 6;
              return (
                <div
                  key={day}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 28,
                      height: chartInView ? `${heights[i]}%` : "0%",
                      background: isToday
                        ? "linear-gradient(180deg, var(--accent), var(--gradient-end))"
                        : "rgba(124,58,237,0.15)",
                      borderRadius: "4px 4px 0 0",
                      transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${0.6 + i * 0.08}s`,
                      boxShadow: isToday
                        ? "0 0 16px rgba(124,58,237,0.3)"
                        : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isToday
                        ? "linear-gradient(180deg, var(--accent), var(--gradient-end))"
                        : "rgba(124,58,237,0.3)";
                      e.currentTarget.style.boxShadow =
                        "0 0 20px rgba(124,58,237,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isToday
                        ? "linear-gradient(180deg, var(--accent), var(--gradient-end))"
                        : "rgba(124,58,237,0.15)";
                      e.currentTarget.style.boxShadow = isToday
                        ? "0 0 16px rgba(124,58,237,0.3)"
                        : "none";
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: isToday
                        ? "var(--accent)"
                        : "var(--text-muted)",
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {day}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </motion.div>
    </>
  );
}
