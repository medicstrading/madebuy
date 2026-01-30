const path = require('path')

// Cache bust: 2026-01-30-v2 - trigger Railway rebuild with Dockerfile.full
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for Docker deployment - creates minimal server.js that handles PORT env var
  output: 'standalone',
  // For monorepo: include files from the root (two directories up from apps/admin)
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: [
    '@madebuy/shared',
    '@madebuy/db',
    '@madebuy/storage',
    '@madebuy/social',
    '@madebuy/shipping',
  ],

  // Bundle optimization
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@madebuy/shared',
      '@madebuy/db',
      '@madebuy/storage',
      'lucide-react',
      'date-fns',
    ],
  },

  // Webpack config to handle server-only packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages in client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp: false,
        'tesseract.js': false,
        'pdf-lib': false,
      }
    }
    return config
  },

  // Security Headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const isDev = process.env.NODE_ENV === 'development'
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Only enable HSTS in production (breaks HTTP dev servers)
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Only allow unsafe-eval in development (needed for hot reload)
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com https://challenges.cloudflare.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.cloudflare.com https://*.stripe.com https://images.unsplash.com https://storage.googleapis.com",
              "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://api.stripe.com https://*.stripe.com https://getlate.dev https://auth.ebay.com https://api.ebay.com https://auth.sandbox.ebay.com https://api.sandbox.ebay.com wss://*",
              "media-src 'self' blob: https:",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              // Only upgrade to HTTPS in production
              ...(isProd ? ['upgrade-insecure-requests'] : []),
              // CSP violation reporting
              'report-uri /api/csp-report',
            ]
              .filter(Boolean)
              .join('; '),
          },
        ],
      },
    ]
  },

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
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    // Image optimization settings
    minimumCacheTTL: 31536000, // 1 year - images are immutable (URL changes when updated)
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
// Railway rebuild trigger - 2026-01-17T03:14:14+00:00
