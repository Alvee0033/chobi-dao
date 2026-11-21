/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [{
      source: "/admin/:path*",
      destination: "http://admin:3100/admin/:path*"
    }];
  },
  async headers() {
    return [{
      source: "/assets/chobidao.webp",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }]
    }, {
      source: "/images/landing/:asset(event-memory.webp|event-hero.webp|step-scan.webp|step-selfie.webp|step-find.webp)",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }]
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/**" },
      { protocol: "https", hostname: "api-gateway-teal-five.vercel.app", pathname: "/**" },
      { protocol: "https", hostname: "**.vercel.app", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" }
    ]
  }
};

export default nextConfig;
