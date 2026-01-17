'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { SectionProps } from './SectionRenderer'

const HEIGHT_MAP = {
  small: 'h-[40vh] min-h-[300px]',
  medium: 'h-[60vh] min-h-[400px]',
  large: 'h-[75vh] min-h-[500px]',
  full: 'h-screen',
}

export function HeroSimple({ settings, tenant, tenantSlug }: SectionProps) {
  const height = settings.height || 'medium'
  const overlayOpacity = settings.overlayOpacity ?? 40
  const title = settings.title || tenant.businessName
  const subtitle = settings.subtitle || tenant.tagline

  // Get first slide if available, otherwise use banner
  const slide = settings.slides?.[0]
  const imageUrl = slide?.imageUrl || undefined
  const ctaText = settings.ctaButton?.text || slide?.ctaText || 'Shop Now'
  const ctaUrl =
    settings.ctaButton?.url || slide?.ctaUrl || `/${tenantSlug}/shop`

  return (
    <div className={`relative ${HEIGHT_MAP[height]} overflow-hidden`}>
      {/* Background Image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title || 'Hero'}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: tenant.primaryColor || '#1a1a1a',
          }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className="relative h-full flex items-center px-6 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          {title && (
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif mb-4 md:mb-6 leading-tight text-white">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-lg md:text-xl lg:text-2xl mb-8 md:mb-12 opacity-90 leading-relaxed max-w-xl text-white/90">
              {subtitle}
            </p>
          )}
          <Link
            href={ctaUrl}
            className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: tenant.primaryColor || '#3b82f6',
            }}
          >
            {ctaText} <span className="ml-2">→</span>
          </Link>
        </div>
      </div>

      {/* Scroll indicator for full-height heroes */}
      {height === 'full' && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          aria-hidden="true"
        >
          <svg
            className="w-6 h-6 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
