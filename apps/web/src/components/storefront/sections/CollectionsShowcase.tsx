'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FolderOpen } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

export function CollectionsShowcase({ settings, tenant, tenantSlug, collections }: SectionProps) {
  const title = settings.title || 'Our Collections'
  const subtitle = settings.subtitle
  const displayCollections = collections?.filter((c) => c.isPublished).slice(0, 6) || []

  if (displayCollections.length === 0) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section header */}
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

      {/* Collections grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {displayCollections.map((collection) => {
          // Note: coverMediaId needs to be resolved to a URL by the parent component
          // For now, we show a gradient placeholder - parent should pass resolved media
          const coverImage = (collection as { coverMediaUrl?: string }).coverMediaUrl
          const href = `/${tenantSlug}/collections/${collection.slug}`

          return (
            <Link key={collection.id} href={href} className="group">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={collection.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}, ${tenant.accentColor || '#3b82f6'})`,
                    }}
                  >
                    <FolderOpen className="w-12 h-12 text-white/50" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-serif text-white mb-1">
                    {collection.name}
                  </h3>
                  {collection.pieceIds?.length > 0 && (
                    <p className="text-white/80 text-sm">
                      {collection.pieceIds.length} {collection.pieceIds.length === 1 ? 'piece' : 'pieces'}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* View all link */}
      {collections && collections.length > 6 && (
        <div className="text-center mt-12">
          <Link
            href={`/${tenantSlug}/collections`}
            className="inline-flex items-center text-lg font-medium hover:underline"
            style={{ color: tenant.primaryColor }}
          >
            View All Collections <span className="ml-2">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}
