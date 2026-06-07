import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stacks/connect"],
  outputFileTracingRoot: process.cwd(),

  // Webpack configuration to handle external dependencies
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
      { module: /node_modules\/ox/ },
    ];

    return config;
  },

  // Removed rewrites - we're using API route handlers instead
  // API routes in app/api/ will proxy to backend using NEXT_PUBLIC_API_URL
};

export default nextConfig;
