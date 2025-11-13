import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/API/function/:path*",
        destination: "http://127.0.0.1:3335/API/function/:path*",
      },
    ];
  },
};

export default nextConfig;
