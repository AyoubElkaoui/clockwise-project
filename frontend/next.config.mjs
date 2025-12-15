/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: process.cwd(),

  // ✅ Alleen dit is aangepast
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://loath-lila-unflowing.ngrok-free.dev/api",
  },

  reactStrictMode: false,
  output: "standalone",
};
export default nextConfig;
