import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stacks/connect"],
  outputFileTracingRoot: process.cwd(),
  // Removed rewrites - we're using API route handlers instead
  // API routes in app/api/ will proxy to backend using NEXT_PUBLIC_API_URL
};

export default nextConfig;
