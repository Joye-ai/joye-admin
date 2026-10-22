import type { NextConfig } from "next";

const adminApiUrl = process.env.ADMIN_API_URL || "http://localhost:8081";

const nextConfig: NextConfig = {
  // Large tenant Teams card / org-analytics proxies can exceed the default 30s.
  experimental: {
    proxyTimeout: 300_000,
  },
  async rewrites() {
    return [
      {
        source: "/admin/:path*",
        destination: `${adminApiUrl}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
