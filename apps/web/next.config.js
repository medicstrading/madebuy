const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@madebuy/shared', '@madebuy/db', '@madebuy/storage'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload sourcemaps in production
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a proxy
  tunnelRoute: '/monitoring',

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically annotate React components
  reactComponentAnnotation: {
    enabled: true,
  },

  // Disable Sentry in development
  disableLogger: true,
})
