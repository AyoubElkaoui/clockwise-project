/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { typedRoutes: false },

  // ⬇️ Alleen dit aangepast: weg met ngrok, jouw Koyeb URL mét /api
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://peculiar-lauralee-akws-d0439e43.koyeb.app/api",
  },

  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [/Critical dependency/, /Module not found/];
    return config;
  },
  swcMinify: true,
  reactStrictMode: false,
  output: "standalone",
};
export default nextConfig;
