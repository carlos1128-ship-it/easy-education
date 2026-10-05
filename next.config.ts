import type { NextConfig } from "next";
import path from "node:path";

// Cabeçalhos de segurança em todas as respostas. Sem CSP de scripts (o Next usa scripts inline);
// o CSP abaixo só bloqueia o site dentro de iframes de terceiros, plugins e troca da URL base.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/files/[id]/process": ["./node_modules/@napi-rs/canvas*/**/*"],
  },
  serverExternalPackages: ["@napi-rs/canvas"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
