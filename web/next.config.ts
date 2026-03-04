import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Build CSP: more permissive in dev (allows HMR, eval), strict in production
const cspParts = [
  "default-src 'self'",
  `script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : "'unsafe-inline'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${isDev ? "ws://localhost:* http://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

const ContentSecurityPolicy = cspParts.join("; ") + ";";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enable DNS prefetching for performance
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // HSTS: shorter max-age for localhost, full year for production
          {
            key: "Strict-Transport-Security",
            value: isDev
              ? "max-age=0"
              : "max-age=31536000; includeSubDomains; preload",
          },
          // Restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // Content Security Policy
          { key: "Content-Security-Policy", value: ContentSecurityPolicy },
          // Prevent XSS (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
