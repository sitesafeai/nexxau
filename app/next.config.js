/** @type {import('next').NextConfig} */
const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: false, // Temporarily disable for HLS testing
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002'],
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
}

// Wrap with Sentry if DSN is configured
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only upload source maps in production
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableClientWebpackPlugin: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
  disableServerWebpackPlugin: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
};

// Only wrap with Sentry if DSN is configured
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
} else {
  module.exports = nextConfig;
} 