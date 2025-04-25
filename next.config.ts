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
  },
  // Ensure output is properly generated for Vercel
  output: 'standalone',
};

export default nextConfig;
