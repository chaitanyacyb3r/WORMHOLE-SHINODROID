"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Shield,
    LayoutDashboard,
    Upload,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/scan", icon: Upload, label: "New Scan" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [collapsed, setCollapsed] = useState(false);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside
                className="flex flex-col justify-between fixed h-screen transition-all duration-300 z-40"
                style={{
                    width: collapsed ? "72px" : "260px",
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border)",
                }}
            >
                <div>
                    {/* Logo */}
                    <div className="h-16 flex items-center px-4 gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}>
                            <Shield size={18} color="white" />
                        </div>
                        {!collapsed && (
                            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                ShinobiDroid
                            </span>
                        )}
                    </div>

                    {/* Nav */}
                    <nav className="mt-2 px-3 flex flex-col gap-1">
                        {navItems.map((item) => {
                            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline"
                                    style={{
                                        background: active ? "rgba(124,58,237,0.12)" : "transparent",
                                        color: active ? "var(--accent-hover)" : "var(--text-secondary)",
                                        border: active ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
                                    }}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <item.icon size={18} className="flex-shrink-0" />
                                    {!collapsed && item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="px-3 pb-4 flex flex-col gap-2">
                    {/* Collapse toggle */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full"
                        style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full"
                        style={{ color: "var(--danger)", background: "transparent", border: "none", cursor: "pointer" }}
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {!collapsed && "Sign Out"}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main
                className="flex-1 transition-all duration-300"
                style={{ marginLeft: collapsed ? "72px" : "260px" }}
            >
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
