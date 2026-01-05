'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

export function ProductFeatured({ settings, tenant, tenantSlug, pieces }: SectionProps) {
  const title = settings.title || 'Featured Piece'
  const subtitle = settings.subtitle

  // Find the first featured piece, or just use the first piece
  const featuredPiece = pieces?.find((p) => p.isFeatured) || pieces?.[0]

  if (!featuredPiece) {
    return null
  }

  // Get primary image URL from PieceWithMedia
  const primaryMedia = featuredPiece.primaryImage || featuredPiece.allImages?.[0]
  const imageUrl = primaryMedia?.variants?.large?.url || primaryMedia?.variants?.original?.url
  const href = `/${tenantSlug}/${featuredPiece.websiteSlug || featuredPiece.id}`

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Image */}
        <div className="aspect-[4/5] relative bg-gray-50 rounded-2xl overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={featuredPiece.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          {(title || subtitle) && (
            <div className="mb-6">
              {subtitle && (
                <span
                  className="text-sm font-medium uppercase tracking-wider"
                  style={{ color: tenant.accentColor || '#f59e0b' }}
                >
                  {subtitle}
                </span>
              )}
              {title && (
                <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mt-2">
                  {title}
                </h2>
              )}
            </div>
          )}

          <h3 className="text-2xl md:text-3xl font-serif text-gray-900 mb-4">
            {featuredPiece.name}
          </h3>

          {featuredPiece.description && (
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              {featuredPiece.description}
            </p>
          )}

          {/* Materials */}
          {(featuredPiece.metals?.length || featuredPiece.stones?.length) && (
            <p className="text-gray-500 mb-6">
              {featuredPiece.metals?.join(', ')}
              {featuredPiece.metals?.length && featuredPiece.stones?.length && ' • '}
              {featuredPiece.stones?.join(', ')}
            </p>
          )}

          {/* Price */}
          {featuredPiece.price && (
            <p className="text-2xl font-semibold text-gray-900 mb-8">
              ${featuredPiece.price.toFixed(2)}
            </p>
          )}

          <Link
            href={href}
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
          >
            View Details <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
