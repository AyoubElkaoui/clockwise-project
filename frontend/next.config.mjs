/** @type {import('next').NextConfig} */ 
const nextConfig = { 
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { typedRoutes: false },

  // ✅ Alleen dit is aangepast
  async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/:path*`,
    },
  ];
},

  webpack: (config) => {
    config.ignoreWarnings = [/Critical dependency/, /Module not found/];
    return config;
  },
  swcMinify: true,
  reactStrictMode: false,
  output: "standalone",
};
export default nextConfig;
