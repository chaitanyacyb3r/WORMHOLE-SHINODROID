"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    if (!convex) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0a0a0a",
                color: "#e5e5e5",
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: "2rem",
            }}>
                <div style={{
                    maxWidth: "520px",
                    textAlign: "center",
                    border: "1px solid #262626",
                    borderRadius: "12px",
                    padding: "2.5rem",
                    background: "#111",
                }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#f59e0b" }}>
                        ⚠ Convex Not Configured
                    </h2>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#a3a3a3", marginBottom: "1.5rem" }}>
                        <code style={{ background: "#1e1e1e", padding: "2px 6px", borderRadius: "4px", color: "#60a5fa" }}>
                            NEXT_PUBLIC_CONVEX_URL
                        </code>{" "}
                        is not set. Run the following command inside the{" "}
                        <code style={{ background: "#1e1e1e", padding: "2px 6px", borderRadius: "4px", color: "#60a5fa" }}>
                            web/
                        </code>{" "}
                        directory to set up Convex:
                    </p>
                    <pre style={{
                        background: "#1a1a2e",
                        border: "1px solid #262626",
                        borderRadius: "8px",
                        padding: "1rem",
                        fontSize: "0.85rem",
                        color: "#4ade80",
                        textAlign: "left",
                        overflowX: "auto",
                    }}>
                        npx convex dev
                    </pre>
                    <p style={{ fontSize: "0.8rem", color: "#737373", marginTop: "1rem" }}>
                        This will create a <code>.env.local</code> file with your Convex deployment URL.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ConvexAuthProvider client={convex}>
            {children}
        </ConvexAuthProvider>
    );
}
