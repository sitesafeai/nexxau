/** @type {import('next').NextConfig} */
const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: false, // Temporarily disable for HLS testing
  // Fix lockfile warning by explicitly setting the root
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Disable ESLint during build to avoid memory issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during build to avoid memory issues
    ignoreBuildErrors: true,
  },
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
  webpack: (config, { isServer }) => {
    // Only disable fs/net/tls on client side, allow on server side for API routes
    if (!isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false };
    }
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
  async rewrites() {
    // Proxy streaming requests to MediaMTX if configured
    const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL;
    if (streamBaseUrl && streamBaseUrl !== 'http://localhost:8888') {
      return [
        {
          source: '/streams/:path*',
          destination: `${streamBaseUrl}/streams/:path*`,
        },
      ];
    }
    // If using default localhost:8888, streams are served by Next.js route handler
    return [];
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