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
};

export default nextConfig;
