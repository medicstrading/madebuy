const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@madebuy/shared', '@madebuy/db', '@madebuy/storage', '@madebuy/social', '@madebuy/marketplaces'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
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
  // Disabled - causes "Could not find module in React Client Manifest" errors
  // with client components in route groups like (auth)
  reactComponentAnnotation: {
    enabled: false,
  },

  // Disable Sentry in development
  disableLogger: true,
})
