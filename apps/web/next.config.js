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
    ],
  },
}

module.exports = nextConfig
