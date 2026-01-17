'use client'

import type { HeroSlide } from '@madebuy/shared'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { SectionProps } from './SectionRenderer'

const HEIGHT_MAP = {
  small: 'h-[40vh] min-h-[300px]',
  medium: 'h-[60vh] min-h-[400px]',
  large: 'h-[75vh] min-h-[500px]',
  full: 'h-[85vh]',
}

export function HeroSlider({ settings, tenant, tenantSlug }: SectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const height = settings.height || 'full'
  const overlayOpacity = settings.overlayOpacity ?? 50

  // Use settings slides or create default
  const slides: HeroSlide[] = settings.slides?.length
    ? settings.slides
    : [
        {
          id: 'default',
          title: tenant.businessName,
          subtitle: tenant.tagline || tenant.description,
          ctaText: 'Shop Now',
          ctaUrl: `/${tenantSlug}/shop`,
        },
      ]

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [slides.length])

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  return (
    <div className={`relative ${HEIGHT_MAP[height]} overflow-hidden`}>
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Background */}
          {slide.imageUrl ? (
            <Image
              src={slide.imageUrl}
              alt={slide.title || `Slide ${index + 1}`}
              fill
              priority={index === 0}
              className="object-cover object-center"
              sizes="100vw"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}, ${tenant.accentColor || '#3b82f6'})`,
              }}
            />
          )}

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/50"
            style={{ opacity: overlayOpacity / 100 }}
          />

          {/* Content */}
          <div className="relative h-full flex items-start pt-[20vh] md:pt-[22vh] px-6 md:px-8 lg:px-12">
            <div className="max-w-2xl text-left text-white">
              {slide.title && (
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif mb-4 md:mb-6 leading-tight text-white">
                  {slide.title}
                </h1>
              )}
              {slide.subtitle && (
                <p className="text-lg md:text-xl lg:text-2xl mb-8 md:mb-12 opacity-90 leading-relaxed max-w-xl">
                  {slide.subtitle}
                </p>
              )}
              {slide.ctaText && slide.ctaUrl && (
                <Link
                  href={slide.ctaUrl}
                  className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: tenant.primaryColor || '#3b82f6',
                  }}
                >
                  {slide.ctaText} <span className="ml-2">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors z-10"
            aria-label="Next slide"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>

          {/* Slide indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Scroll indicator */}
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
    </div>
  )
}
