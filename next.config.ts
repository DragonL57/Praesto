import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'i.ytimg.com',
      },
      {
        hostname: 'img.youtube.com',
      },
    ],
    unoptimized: true, // Added from template
  },
  // Ensure output is properly generated for Vercel
  output: 'standalone',
  // Added from template
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Added from template
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
