import type { NextConfig } from "next";

const nextConfig = {
  serverExternalPackages: ["@lancedb/lancedb", "better-sqlite3", "pdf-parse"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
