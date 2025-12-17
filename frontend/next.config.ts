import type { NextConfig } from "next";

const apiTarget =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const cleanTarget = apiTarget.replace(/\/$/, "");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: false,
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
    INTERNAL_API_URL: process.env.INTERNAL_API_URL ?? "",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${cleanTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
