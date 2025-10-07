/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // 👉 In dev proxy naar localhost:5000, in Vercel naar je Koyeb-URL via env
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/:path*`,
        // LET OP: geen extra "/api" hier, je calls gaan al naar /api/... in de app
      },
    ];
  },

  // (optioneel) houd de build soepel
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  swcMinify: true,
};

export default nextConfig;
