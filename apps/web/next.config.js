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

  // Route browser requests to Sentry through a proxy
  tunnelRoute: '/monitoring',

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Disabled - adds overhead and can cause build issues
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
