'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import type { SectionProps } from './SectionRenderer'

export function GalleryMasonry({ settings, tenant, pieces }: SectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const title = settings.title || 'Gallery'
  const subtitle = settings.subtitle
  const galleryStyle = settings.galleryStyle || 'masonry'
  const columns = settings.galleryColumns || 3

  // Get images from settings or from pieces
  const images: { url: string; alt: string }[] = []

  if (settings.images?.length) {
    settings.images.forEach((url: string, i: number) => {
      images.push({ url, alt: `Gallery image ${i + 1}` })
    })
  } else if (pieces?.length) {
    // Use piece images from PieceWithMedia.allImages
    pieces.forEach((piece) => {
      piece.allImages?.forEach((media) => {
        const url = media.variants?.large?.url || media.variants?.original?.url
        if (url) {
          images.push({ url, alt: piece.name })
        }
      })
    })
  }

  if (images.length === 0) {
    return null
  }

  const displayImages = images.slice(0, 12)

  const columnsClass =
    {
      2: 'columns-1 sm:columns-2',
      3: 'columns-1 sm:columns-2 lg:columns-3',
      4: 'columns-1 sm:columns-2 lg:columns-4',
    }[columns] || 'columns-1 sm:columns-2 lg:columns-3'

  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () =>
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + displayImages.length) % displayImages.length
        : null,
    )
  const nextImage = () =>
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % displayImages.length : null,
    )

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section header */}
      {(title || subtitle) && (
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Gallery */}
      {galleryStyle === 'masonry' ? (
        <div className={`${columnsClass} gap-4`}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className="mb-4 break-inside-avoid cursor-pointer group"
              onClick={() => setLightboxIndex(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setLightboxIndex(index)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${image.alt}`}
            >
              <div className="relative overflow-hidden rounded-lg">
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      ) : galleryStyle === 'grid' ? (
        <div className={`grid grid-cols-2 lg:grid-cols-${columns} gap-4`}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group"
              onClick={() => setLightboxIndex(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setLightboxIndex(index)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${image.alt}`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes={`(max-width: 768px) 50vw, ${100 / columns}vw`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      ) : (
        // Carousel style
        <div className="relative overflow-x-auto pb-4">
          <div className="flex gap-4">
            {displayImages.map((image, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-80 aspect-[4/3] relative overflow-hidden rounded-lg cursor-pointer group"
                onClick={() => setLightboxIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setLightboxIndex(index)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${image.alt}`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="320px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeLightbox()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close lightbox"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>

          {displayImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
                className="absolute left-4 text-white/80 hover:text-white z-10"
                aria-label="Previous"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                className="absolute right-4 text-white/80 hover:text-white z-10"
                aria-label="Next"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          <div
            className="relative max-w-5xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <Image
              src={displayImages[lightboxIndex].url}
              alt={displayImages[lightboxIndex].alt}
              width={1200}
              height={800}
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
