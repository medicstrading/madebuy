/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@madebuy/shared', '@madebuy/db', '@madebuy/storage', '@madebuy/social', '@madebuy/cloudflare'],

  // Bundle optimization
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@madebuy/shared',
      '@madebuy/db',
      'lucide-react',
      'date-fns',
    ],
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
          ...(isProd ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          }] : []),
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
              "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.cloudflare.com https://*.stripe.com",
              "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://api.stripe.com https://*.stripe.com https://getlate.dev wss://*",
              "media-src 'self' blob: https:",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              // Only upgrade to HTTPS in production
              ...(isProd ? ["upgrade-insecure-requests"] : [])
            ].filter(Boolean).join('; '),
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
    ],
    // Image optimization settings
    minimumCacheTTL: 31536000, // 1 year - images are immutable (URL changes when updated)
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
