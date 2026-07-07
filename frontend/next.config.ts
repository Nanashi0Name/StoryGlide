import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to proxy API requests to the FastAPI backend.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
