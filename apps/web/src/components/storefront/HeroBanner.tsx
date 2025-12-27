import Image from 'next/image'
import Link from 'next/link'
import type { TenantWebsiteDesign } from '@madebuy/shared/src/types/tenant'

interface HeroBannerProps {
  banner: TenantWebsiteDesign['banner']
  tenantSlug: string
}

export function HeroBanner({ banner, tenantSlug }: HeroBannerProps) {
  if (!banner) return null

  const heightClasses = {
    small: 'h-[300px]',
    medium: 'h-[400px]',
    large: 'h-[500px]',
  }

  const hasImage = banner.mediaId && banner.mediaId.trim() !== ''

  return (
    <div
      className={`relative w-full ${heightClasses[banner.height || 'medium']} overflow-hidden bg-gray-900`}
    >
      {/* Background Image */}
      {hasImage && (
        <Image
          src={`/api/media/${banner.mediaId}`}
          alt={banner.overlayText || 'Hero Banner'}
          fill
          className="object-cover"
          priority
        />
      )}

      {/* Dark Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: (banner.overlayOpacity || 40) / 100 }}
      />

      {/* Content */}
      <div className="container relative mx-auto flex h-full items-center px-4">
        <div className="max-w-3xl text-white">
          {banner.overlayText && (
            <h1 className="mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
              {banner.overlayText}
            </h1>
          )}
          {banner.overlaySubtext && (
            <p className="mb-8 text-lg md:text-xl lg:text-2xl">
              {banner.overlaySubtext}
            </p>
          )}
          {banner.ctaButton?.text && banner.ctaButton?.url && (
            <Link
              href={`/${tenantSlug}${banner.ctaButton.url}`}
              className="inline-block rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              {banner.ctaButton.text}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
