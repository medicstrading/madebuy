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

// Set to true to bypass Sentry for debugging build issues
const BYPASS_SENTRY = false

const sentryConfig = {
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

  // Webpack options for Next.js - App Router only project
  webpack: {
    // Disable Pages Router instrumentation (App Router only)
    autoInstrumentServerFunctions: false,
    // Exclude error routes from instrumentation
    excludeServerRoutes: [
      '/_error',
      '/404',
      '/500',
    ],
  },
}

module.exports = BYPASS_SENTRY ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
