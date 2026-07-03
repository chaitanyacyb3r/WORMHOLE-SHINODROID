"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  ArrowRight,
  Github,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    console.log("[LOGIN PAGE] 📊 Auth state:", {
      isAuthenticated,
      authLoading,
      hasRedirected: hasRedirected.current,
      timestamp: new Date().toISOString(),
    });
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (isAuthenticated && !authLoading && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log(
        "[LOGIN PAGE] 🚀 Auth confirmed! Redirecting to /dashboard..."
      );
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, authLoading]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("[LOGIN] 🚀 Calling signIn('password') for:", email);
      const result = await signIn("password", {
        email,
        password,
        flow: "signIn",
      });
      console.log("[LOGIN] ✅ signIn returned:", JSON.stringify(result));
      // Login succeeded — redirect immediately to dashboard
      hasRedirected.current = true;
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      console.error("[LOGIN] ❌ signIn threw:", err);
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      setError(message);
      setLoading(false);
    }
  }

  async function handleGithubLogin() {
    try {
      await signIn("github");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "GitHub login failed";
      setError(message);
    }
  }

  /* ── Loading / Redirect states ── */
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-0)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: "var(--text-body-sm)" }}>
            Checking session...
          </span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-0)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: "var(--text-body-sm)" }}>
            Redirecting to dashboard...
          </span>
        </div>
      </div>
    );
  }

  /* ── Main Login ── */
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "var(--surface-0)",
      }}
    >
      {/* ── LEFT: Branding Panel ── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "48px",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            opacity: 0.08,
            filter: "blur(100px)",
            background:
              "radial-gradient(circle, var(--accent), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Floating security icons */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "20%",
            color: "var(--text-muted)",
            opacity: 0.15,
            transform: "rotate(-15deg)",
          }}
        >
          <KeyRound size={40} />
        </div>
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "25%",
            color: "var(--text-muted)",
            opacity: 0.12,
            transform: "rotate(10deg)",
          }}
        >
          <Lock size={48} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "15%",
            color: "var(--text-muted)",
            opacity: 0.1,
            transform: "rotate(20deg)",
          }}
        >
          <ShieldCheck size={36} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "30%",
            right: "15%",
            color: "var(--text-muted)",
            opacity: 0.08,
            transform: "rotate(-10deg)",
          }}
        >
          <ShieldCheck size={44} />
        </div>

        {/* Logo + brand */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <img
            src="/logo.png"
            alt="Shinodroid"
            width={80}
            height={80}
            style={{
              objectFit: "contain",
            }}
          />
          <h2
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Shinodroid
          </h2>
          <p
            style={{
              fontSize: "var(--text-body-sm)",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            by WORMHOLE Security
          </p>
        </div>

        {/* Testimonial */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            left: "48px",
            right: "48px",
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-base)",
            padding: "20px 24px",
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontSize: "var(--text-body-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
              marginBottom: "12px",
              fontStyle: "italic",
            }}
          >
            &ldquo;Shinodroid caught 3 critical vulnerabilities in our app that
            our AI coding assistant completely missed.&rdquo;
          </p>
          <p
            style={{
              fontSize: "var(--text-caption)",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            — Alex R., Startup Founder
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          background: "var(--surface-1)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h1
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: "var(--text-body)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-xl)",
            }}
          >
            Sign in to your Shinodroid account
          </p>

          {/* GitHub */}
          <button
            onClick={handleGithubLogin}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              fontSize: "var(--text-body-sm)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background var(--duration-fast), border-color var(--duration-fast)",
              marginBottom: "var(--space-lg)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <Github size={18} />
            Continue with GitHub
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "var(--space-lg)",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
            <span
              style={{
                fontSize: "var(--text-caption)",
                color: "var(--text-muted)",
                textTransform: "lowercase",
              }}
            >
              or
            </span>
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
          </div>

          {/* Form */}
          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-lg)",
            }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input"
                  style={{ paddingLeft: "42px", width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-sm)",
                }}
              >
                <label
                  style={{
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Password
                </label>
                <a
                  href="#"
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Forgot?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input"
                  style={{
                    paddingLeft: "42px",
                    paddingRight: "42px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "var(--text-body-sm)",
                color: "var(--text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                }}
              />
              Remember me
            </label>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--danger)",
                  fontSize: "var(--text-body-sm)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 24px",
                fontSize: "var(--text-body)",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p
            style={{
              textAlign: "center",
              marginTop: "var(--space-xl)",
              fontSize: "var(--text-body-sm)",
              color: "var(--text-muted)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign up →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
