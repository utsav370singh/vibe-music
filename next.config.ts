import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-16456fc0-1836-4fde-83fb-6b40e8d0b7ad.space-z.ai",
    "*.space-z.ai",
  ],
};

export default nextConfig;
