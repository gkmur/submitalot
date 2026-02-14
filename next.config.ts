import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  distDir: isDev ? ".next-dev" : ".next",
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
