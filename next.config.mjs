/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the workspace root to this project. Without it, Next.js walks up looking
// for a lockfile and can pick a parent directory (e.g. when the project is
// checked out as a git worktree under the main repo), which makes it resolve
// app-router modules through a long `../../..` path and fail outright.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy — enforced in production only.
// Dev mode skips CSP because Next.js HMR and webpack need unsafe-eval.
const isProd = process.env.NODE_ENV === "production";
const cspHeader = isProd
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://tradingle.com https://www.tradingle.com https://accounts.google.com https://www.googleapis.com wss:",
      "frame-src https://accounts.google.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "upgrade-insecure-requests",
    ].join("; ")
  : undefined;

// Allow extra dev origins via env var (e.g. for proxied preview environments).
// 127.0.0.1 and localhost are always included so the Replit iframe proxy and
// HMR websocket connections aren't blocked in development.
// On Replit, REPLIT_DEV_DOMAIN is also injected automatically.
// Example: NEXT_DEV_ALLOWED_ORIGINS="mycompany.ngrok.io,192.168.1.10"
const extraDevOrigins = [
  "127.0.0.1",
  "localhost",
  ...(process.env.NEXT_DEV_ALLOWED_ORIGINS
    ? process.env.NEXT_DEV_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : []),
  ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
];

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  ...(extraDevOrigins.length > 0 ? { allowedDevOrigins: extraDevOrigins } : {}),
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 3600,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS: enforce HTTPS for 1 year, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content-Security-Policy (production only — dev needs unsafe-eval for HMR)
          ...(cspHeader ? [{ key: "Content-Security-Policy", value: cspHeader }] : []),
        ],
      },
      ...(isProd
        ? [
            {
              source: "/_next/static/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/assets/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
    ];
  },
  async rewrites() {
    const apiTarget =
      process.env.API_PROXY_TARGET ||
      process.env.API_SERVER_BASE ||
      "https://tradingle.com/api";
    const base = apiTarget.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
