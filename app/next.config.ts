/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double-mounting in development which causes premature WebRTC cleanup
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Configure the app directory
  distDir: '.next',
  // Ignore the backend directory during build
  webpack: (config: any) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/backend/**'],
    };
    return config;
  },
  turbopack: {
    rules: {
      // Add any Turbopack-specific rules here
    },
  },
};

export default nextConfig;
