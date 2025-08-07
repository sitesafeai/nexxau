/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig 