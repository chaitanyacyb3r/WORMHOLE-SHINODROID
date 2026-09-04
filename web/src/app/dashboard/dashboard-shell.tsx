"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const StarField3D = dynamic(() => import("../components/StarField3D"), { ssr: false });
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/scan", icon: Upload, label: "New Scan" },
  { href: "/dashboard/reports", icon: Clock, label: "Scan History" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  useEffect(() => {
    console.log("[DASHBOARD SHELL] 📊 Auth state:", {
      isAuthenticated,
      authLoading,
      pathname,
    });
  }, [isAuthenticated, authLoading, pathname]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, authLoading]);

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  // ── Loading / Unauthed states ──
  if (authLoading || !isAuthenticated) {
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
            gap: 16,
            animation: "fadeInUp var(--duration-normal) var(--ease-out) both",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), var(--gradient-end))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "spin-slow 2s linear infinite",
            }}
          >
            <Sparkles size={20} color="white" />
          </div>
          <span
            style={{
              fontSize: "var(--text-body-sm)",
              color: "var(--text-muted)",
            }}
          >
            {authLoading ? "Loading dashboard..." : "Redirecting to login..."}
          </span>
        </div>
      </div>
    );
  }

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const sidebarW = collapsed ? 72 : 248;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--surface-0)" }}>
      {/* ═══════  SIDEBAR  ═══════ */}
      <aside
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          width: sidebarW,
          display: "flex",
          flexDirection: "column",
          background: "rgba(10, 10, 18, 0.7)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRight: "1px solid rgba(124, 58, 237, 0.1)",
          transition: "width var(--duration-normal) var(--ease-out)",
          zIndex: 50,
          overflow: "hidden",
        }}
      >
        {/* ── Logo Row ── */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="Shinodroid"
            width={36}
            height={36}
            style={{
              borderRadius: "50%",
              objectFit: "contain",
              flexShrink: 0,
              boxShadow: "var(--glow-sm)",
            }}
          />
          {!collapsed && (
            <span
              style={{
                fontWeight: 700,
                fontSize: "var(--text-body)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              Shinodroid
            </span>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav
          style={{
            flex: 1,
            padding: "var(--space-base) var(--space-sm)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const isHovered = hoveredNav === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onMouseEnter={() => setHoveredNav(item.href)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "11px 0" : "11px 14px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: "var(--radius-base)",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all var(--duration-fast) var(--ease-out)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.06))"
                    : isHovered
                      ? "var(--surface-2)"
                      : "transparent",
                  color: isActive ? "#a78bfa" : "var(--text-secondary)",
                  borderLeft: isActive
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                  boxShadow: isActive ? "var(--glow-sm)" : "none",
                }}
              >
                <item.icon
                  size={18}
                  style={{
                    flexShrink: 0,
                    filter: isActive ? "drop-shadow(0 0 4px rgba(124,58,237,0.4))" : "none",
                  }}
                />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom: Profile + Controls ── */}
        <div
          style={{
            padding: "var(--space-base)",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          {/* Profile card */}
          {!collapsed && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: "var(--radius-base)",
                background: "linear-gradient(135deg, var(--surface-2), var(--surface-3))",
                border: "1px solid var(--border-subtle)",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), var(--gradient-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userName}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(124,58,237,0.15)",
                    color: "#a78bfa",
                    marginTop: 3,
                  }}
                >
                  <Sparkles size={8} /> Free
                </span>
              </div>
            </div>
          )}

          {/* Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-body-sm)",
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "100%",
              transition: "color var(--duration-fast)",
            }}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} /> Collapse
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-body-sm)",
              color: "var(--danger)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "100%",
              transition: "background var(--duration-fast)",
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ═══════  MAIN  ═══════ */}
      <main
        style={{
          flex: 1,
          marginLeft: sidebarW,
          transition: "margin-left var(--duration-normal) var(--ease-out)",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        {/* Ambient background effects */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.6, pointerEvents: "none" }}>
          <StarField3D />
        </div>
        
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            background: [
              "radial-gradient(ellipse 60% 50% at 25% 50%, rgba(124, 58, 237, 0.06), transparent)",
              "radial-gradient(ellipse 50% 40% at 80% 20%, rgba(236, 72, 153, 0.04), transparent)",
              "radial-gradient(ellipse 40% 50% at 60% 85%, rgba(59, 130, 246, 0.03), transparent)",
            ].join(", "),
          }}
        />
        <div style={{ padding: "var(--space-xl) var(--space-2xl)", maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
