import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShinobiDroid | WORMHOLE Security",
  description:
    "Automated Android penetration testing platform. Upload APKs, get industry-grade security reports with static analysis, dynamic instrumentation, SSL pinning bypass, and root detection testing.",
  keywords: [
    "android security",
    "penetration testing",
    "mobile app security",
    "APK scanner",
    "MobSF",
    "Frida",
    "OWASP",
    "vulnerability scanner",
  ],
  authors: [{ name: "WORMHOLE Security" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grid" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
