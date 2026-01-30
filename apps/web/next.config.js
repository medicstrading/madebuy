const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment - creates minimal server.js that handles PORT env var
  output: 'standalone',
  // For monorepo: include files from the root (two directories up from apps/web)
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@madebuy/shared', '@madebuy/db', '@madebuy/storage'],

  // Bundle optimization
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['@madebuy/shared', '@madebuy/db', 'lucide-react'],
  },

  // Security Headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
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
              // Removed unsafe-eval in production; kept unsafe-inline for Next.js inline scripts
              isProd
                ? "script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com"
                : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.cloudflare.com https://*.stripe.com https://images.unsplash.com",
              "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://api.stripe.com https://*.stripe.com https://getlate.dev wss://*",
              "media-src 'self' blob: https://*.r2.dev",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
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
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Image optimization settings
    minimumCacheTTL: 31536000, // 1 year
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
