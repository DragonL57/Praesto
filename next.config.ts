import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
  },
  // Exclude server-only packages from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'googleapis': false,
        'google-auth-library': false,
      };
    }
    return config;
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
