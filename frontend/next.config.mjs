/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Proxy API requests automatisch
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // 👇 Gebruik Koyeb in productie, localhost in development
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        }/:path*`,
      },
    ];
  },

  // ✅ Build-instellingen (veilig laten staan)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false,
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
