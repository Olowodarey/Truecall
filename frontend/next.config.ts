import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stacks/connect"],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
