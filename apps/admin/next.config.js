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

  // Route browser requests to Sentry through a proxy
  tunnelRoute: '/monitoring',

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Disabled - causes build issues with client components in route groups
  reactComponentAnnotation: {
    enabled: false,
  },

  // Disable Sentry in development
  disableLogger: true,

  // Bundle size optimizations - tree-shake unused Sentry code
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayWorker: true,
    excludeReplayShadowDOM: true,
    excludeReplayIframe: true,
    excludeReplayCanvas: true,
  },
})
