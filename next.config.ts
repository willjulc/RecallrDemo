import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@lancedb/lancedb", "better-sqlite3", "pdf-parse"],
};

export default nextConfig;
