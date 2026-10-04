import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
