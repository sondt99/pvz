import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling native ws addons — let Node.js require them
  // at runtime so MODULE_NOT_FOUND triggers ws's pure-JS fallback gracefully.
  serverExternalPackages: ["bufferutil", "utf-8-validate"],
};

export default nextConfig;
