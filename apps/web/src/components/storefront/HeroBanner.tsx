import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import type { TenantWebsiteDesign } from '@madebuy/shared/src/types/tenant'
import type { Tenant } from '@madebuy/shared'

interface HeroBannerProps {
  banner: TenantWebsiteDesign['banner']
  tenantSlug: string
  logoUrl?: string | null
  tenant?: Tenant
}

export function HeroBanner({ banner, tenantSlug, logoUrl, tenant }: HeroBannerProps) {
  if (!banner) return null

  const heightClasses = {
    small: 'min-h-[280px] py-12',
    medium: 'min-h-[380px] py-16',
    large: 'min-h-[480px] py-20',
  }

  const hasUploadedImage = banner.mediaId && banner.mediaId.trim() !== ''

  return (
    <div className={`relative w-full ${heightClasses[banner.height || 'medium']} overflow-hidden bg-gray-900`}>
      {/* Background Image (uploaded) */}
      {hasUploadedImage && (
        <Image
          src={`/api/media/${banner.mediaId}`}
          alt={banner.overlayText || 'Hero Banner'}
          fill
          className="object-cover"
          priority
        />
      )}

      {/* Default Grey Gradient (no image selected) */}
      {!hasUploadedImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      )}

      {/* Dark Overlay for images */}
      {hasUploadedImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (banner.overlayOpacity || 40) / 100 }}
        />
      )}

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="max-w-2xl text-center mx-auto lg:text-left lg:mx-0">
          {/* Logo */}
          {logoUrl && (
            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm p-1">
                <Image
                  src={logoUrl}
                  alt={tenant?.businessName || 'Store'}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Title */}
          {banner.overlayText && (
            <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              {banner.overlayText}
            </h1>
          )}

          {/* Subtitle */}
          {banner.overlaySubtext && (
            <p className="mb-6 text-lg text-gray-300 leading-relaxed">
              {banner.overlaySubtext}
            </p>
          )}

          {/* Location */}
          {tenant?.location && (
            <div className="mb-8 flex items-center justify-center lg:justify-start gap-2 text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{tenant.location}</span>
            </div>
          )}

          {/* CTA Button */}
          {banner.ctaButton?.text && banner.ctaButton?.url && (
            <Link
              href={`/${tenantSlug}${banner.ctaButton.url}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-medium text-gray-900 transition-all hover:bg-gray-100 hover:shadow-lg"
            >
              {banner.ctaButton.text}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
