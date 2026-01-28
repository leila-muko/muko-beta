import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly tell Next.js to look in src/app
  experimental: {
    // This shouldn't be needed but let's try
  },
};

export default nextConfig;
