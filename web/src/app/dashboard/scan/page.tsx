"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Shield,
  Search,
  Zap,
  Flame,
  Lock,
  ClipboardList,
  Sparkles,
  ArrowRight,
  MonitorSmartphone,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".apk"];

const ENGINES = [
  {
    name: "MobSF Static Analysis",
    desc: "Permissions, manifest, source code, crypto, secrets",
    icon: Search,
    color: "#3b82f6",
  },
  {
    name: "Androwarn Behavior Detection",
    desc: "12 categories of malicious behavior patterns",
    icon: Zap,
    color: "#f59e0b",
  },
  {
    name: "Firebase Misconfiguration",
    desc: "Open databases, exposed storage, API key leaks",
    icon: Flame,
    color: "#f97316",
  },
  {
    name: "Frida Dynamic Instrumentation",
    desc: "SSL pinning, root detection, runtime hooks",
    icon: Shield,
    color: "#8b5cf6",
  },
  {
    name: "Logcat Leak Detection",
    desc: "Passwords, tokens, PII leaked to system logs",
    icon: ClipboardList,
    color: "#10b981",
  },
];

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

const pulseGlow: React.CSSProperties = {
  boxShadow: "0 0 20px rgba(124, 58, 237, 0.2), 0 0 40px rgba(124, 58, 237, 0.1)",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Animations
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 }
  }
};

export default function NewScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [hoveredEngine, setHoveredEngine] = useState<number | null>(null);
  const router = useRouter();

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createScan = useMutation(api.scans.create);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(f: File): string | null {
    if (!ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      return "Only .apk files are allowed";
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
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

    try {
      setProgress(10);
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      if (fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4b) {
        throw new Error("Invalid APK file (not a valid ZIP/APK format)");
      }

      setProgress(20);
      const uploadUrl = await generateUploadUrl();
      setProgress(30);

      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 2, 70));
      }, 500);

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/vnd.android.package-archive" },
        body: file,
      });

      clearInterval(progressInterval);

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await uploadResult.json();
      setProgress(75);

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const scanId = await createScan({
        fileName: file.name,
        filePath: safeName,
        fileSize: file.size,
        storageId,
      });

      setProgress(100);

      setTimeout(() => {
        router.push(`/dashboard/scan/${scanId}`);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setUploading(false);
      setProgress(0);
    }
  }

  const progressLabel =
    progress < 30
      ? "Validating APK..."
      : progress < 70
        ? "Uploading to secure storage..."
        : progress < 100
          ? "Initializing scan engines..."
          : "Scan started! Redirecting...";

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={stagger}
      style={{ position: "relative" }}
    >
      {/* ── Header ── */}
      <motion.div variants={fadeInUp} style={{ marginBottom: "var(--space-2xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              ...glass,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.1))",
            }}
          >
            <Upload size={22} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "var(--text-h2)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              Security Scan
            </h1>
            <p
              style={{
                fontSize: "var(--text-body)",
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Initiate a deep analysis of your Android application.
            </p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-xl)", alignItems: "start" }}>
        
        {/* ═══ LEFT: Upload Area ═══ */}
        <motion.div variants={fadeInUp}>
          <AnimatePresence mode="wait">
            {!file ? (
              /* ── Dropzone ── */
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  ...glass,
                  padding: "var(--space-3xl) var(--space-2xl)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                  background: dragActive
                    ? "rgba(124, 58, 237, 0.12)"
                    : "rgba(15, 15, 25, 0.55)",
                  borderColor: dragActive ? "var(--accent)" : "rgba(124, 58, 237, 0.12)",
                  boxShadow: dragActive ? "0 0 40px rgba(124, 58, 237, 0.2)" : "0 8px 32px rgba(0,0,0,0.2)",
                  minHeight: 380,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                whileHover={{ scale: 1.005, borderColor: "rgba(124, 58, 237, 0.3)" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />

                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    filter: ["drop-shadow(0 0 10px rgba(124,58,237,0))", "drop-shadow(0 0 20px rgba(124,58,237,0.4))", "drop-shadow(0 0 10px rgba(124,58,237,0))"] 
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "24px",
                    background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.15))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "var(--space-xl)",
                  }}
                >
                  <Upload size={32} style={{ color: "white" }} />
                </motion.div>

                <h2
                  style={{
                    fontSize: "var(--text-h4)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 12,
                  }}
                >
                  {dragActive ? "Drop to Analyze" : "Upload Android Application"}
                </h2>
                <p
                  style={{
                    fontSize: "var(--text-body)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-xl)",
                    maxWidth: 400,
                    lineHeight: 1.6,
                  }}
                >
                  Drag and drop your .apk file here or click to browse. Our engine will decompile and audit your app in minutes.
                </p>

                <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "APK Package", icon: "📦" },
                    { label: "100MB Max", icon: "📏" },
                    { label: "Encrypted", icon: "🔒" },
                  ].map((pill) => (
                    <span
                      key={pill.label}
                      style={{
                        ...glass,
                        background: "rgba(124, 58, 237, 0.1)",
                        padding: "8px 16px",
                        fontSize: "var(--text-caption)",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{pill.icon}</span> {pill.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* ── File Selected ── */
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  ...glass,
                  overflow: "hidden",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                }}
              >
                {/* File info header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "var(--space-xl)",
                    borderBottom: "1px solid rgba(124,58,237,0.12)",
                    background: "rgba(124,58,237,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      ...glass,
                      background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
                      border: "1px solid rgba(16,185,129,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={28} style={{ color: "#10b981" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: "var(--text-h5)",
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {file.name}
                    </p>
                    <p
                      style={{
                        fontSize: "var(--text-body-sm)",
                        color: "var(--text-muted)",
                        margin: 0,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span> 
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span>Android Package</span>
                    </p>
                  </div>
                  {!uploading && (
                    <motion.button
                      whileHover={{ scale: 1.1, background: "rgba(239, 68, 68, 0.2)" }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setFile(null); setProgress(0); }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "12px",
                        background: "rgba(15, 15, 25, 0.4)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  )}
                </div>

                {/* Progress bar */}
                {uploading && (
                  <div style={{ padding: "var(--space-xl)", background: "rgba(15, 15, 25, 0.3)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-body)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }} />
                        {progressLabel}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-h5)",
                          fontWeight: 800,
                          color: progress === 100 ? "#10b981" : "var(--accent)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {progress}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 12,
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        padding: 2,
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{
                          height: "100%",
                          borderRadius: "4px",
                          background:
                            progress === 100
                              ? "linear-gradient(90deg, #10b981, #34d399)"
                              : "linear-gradient(90deg, var(--accent), var(--gradient-end))",
                          boxShadow: progress < 100 ? "0 0 20px rgba(124,58,237,0.5)" : "0 0 20px rgba(16,185,129,0.5)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Engine list */}
                <div style={{ padding: "var(--space-xl)" }}>
                  <p
                    style={{
                      fontSize: "var(--text-overline)",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "var(--space-lg)",
                    }}
                  >
                    Active Scanning Engines
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {ENGINES.map((engine, i) => (
                      <motion.div
                        key={i}
                        onMouseEnter={() => setHoveredEngine(i)}
                        onMouseLeave={() => setHoveredEngine(null)}
                        style={{
                          ...glass,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          transition: "all 0.2s ease",
                          background: hoveredEngine === i ? "rgba(124, 58, 237, 0.1)" : "rgba(255, 255, 255, 0.03)",
                          borderColor: hoveredEngine === i ? "rgba(124, 58, 237, 0.3)" : "rgba(124, 58, 237, 0.1)",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            background: `${engine.color}20`,
                            border: `1px solid ${engine.color}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <engine.icon size={18} style={{ color: engine.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "var(--text-body-sm)",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {engine.name.split(" ")[0]}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              margin: 0,
                              marginTop: 1,
                            }}
                          >
                            Online
                          </p>
                        </div>
                        <CheckCircle
                          size={14}
                          style={{ color: "#10b981", flexShrink: 0, opacity: 0.8 }}
                        />
                      </motion.div>
                    ))}
                    <div
                      style={{
                        ...glass,
                        background: "rgba(124, 58, 237, 0.05)",
                        borderStyle: "dashed",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        opacity: 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "10px",
                          border: "1px dashed rgba(124,58,237,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                         <Sparkles size={16} color="var(--accent)" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>AI Triage Module</span>
                    </div>
                  </div>
                </div>

                {/* Upload button */}
                <div style={{ padding: "0 var(--space-xl) var(--space-xl)" }}>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(124, 58, 237, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      padding: "18px 24px",
                      borderRadius: "16px",
                      background: uploading
                        ? "rgba(124, 58, 237, 0.2)"
                        : "linear-gradient(135deg, var(--accent), var(--gradient-end))",
                      color: "white",
                      border: "none",
                      fontSize: "var(--text-body)",
                      fontWeight: 700,
                      cursor: uploading ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {uploading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{
                            width: 22,
                            height: 22,
                            border: "3px solid rgba(255,255,255,0.2)",
                            borderTopColor: "white",
                            borderRadius: "50%",
                          }}
                        />
                        {progress === 100 ? "Processing Report..." : "Deep Scanning..."}
                      </>
                    ) : (
                      <>
                        <Shield size={20} />
                        Launch Deep Security Scan
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: "var(--space-lg)",
                padding: "16px 20px",
                ...glass,
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
              }}
            >
              <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
              <p style={{ fontSize: "var(--text-body)", color: "#fca5a5", margin: 0, fontWeight: 500 }}>
                {error}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* ═══ RIGHT: Info Panel ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          
          {/* Security card */}
          <motion.div
            variants={fadeInUp}
            style={{
              ...glass,
              padding: "var(--space-xl)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.05 }}>
               <Shield size={120} />
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-lg)" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={18} style={{ color: "#10b981" }} />
              </div>
              <h3
                style={{
                  fontSize: "var(--text-h5)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Privacy First
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { text: "E2E Encrypted Storage", icon: "💎" },
                { text: "Sandboxed Execution", icon: "🛡️" },
                { text: "Automated Data Purge", icon: "🧹" },
                { text: "Private Report Access", icon: "🤫" },
              ].map((item) => (
                <div
                  key={item.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: "var(--text-body-sm)",
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Workflow card */}
          <motion.div
            variants={fadeInUp}
            style={{
              ...glass,
              padding: "var(--space-xl)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--text-h5)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--space-lg)",
              }}
            >
              Analysis Workflow
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { step: "01", title: "APK Triage", desc: "Decompilation & Static IR generation" },
                { step: "02", title: "Execution", desc: "Dynamic runtime behavioral testing" },
                { step: "03", title: "AI Audit", desc: "Final triage & remediation roadmap" },
              ].map((item, i) => (
                <div key={item.step} style={{ display: "flex", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "10px",
                        background: i === 0 ? "var(--accent)" : "rgba(255,255,255,0.05)",
                        border: i === 0 ? "none" : "1px solid rgba(124,58,237,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: i === 0 ? "white" : "var(--text-muted)",
                        flexShrink: 0,
                        boxShadow: i === 0 ? "0 0 10px rgba(124,58,237,0.4)" : "none",
                      }}
                    >
                      {item.step}
                    </div>
                    {i < 2 && (
                      <div
                        style={{
                          width: 1,
                          height: 30,
                          background: "rgba(124,58,237,0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < 2 ? 16 : 0 }}>
                    <p
                      style={{
                        fontSize: "var(--text-body-sm)",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        margin: 0,
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stats card */}
          <motion.div
            variants={fadeInUp}
            style={{
              ...glass,
              padding: "var(--space-xl)",
              background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.05))",
              borderColor: "rgba(124,58,237,0.2)",
            }}
          >
             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                 <MonitorSmartphone size={18} color="var(--accent)" />
                 <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 700, color: "var(--text-primary)" }}>Device Sandbox</span>
             </div>
             <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                Dynamic analysis runs on a dedicated Pixel 8 emulator with root-level access and Frida-server pre-installed.
             </p>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
