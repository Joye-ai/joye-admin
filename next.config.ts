import type { NextConfig } from "next";

const adminApiUrl = process.env.ADMIN_API_URL || "http://localhost:8081";

const nextConfig: NextConfig = {
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
