import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/sanitize'
import type { SectionProps } from './SectionRenderer'

export function TextImage({ settings, tenant, tenantSlug }: SectionProps) {
  const title = settings.title
  const content = settings.content || settings.subtitle
  const imageUrl = settings.image
  const imagePosition = settings.imagePosition || 'right'
  const ctaText = settings.ctaButtonText
  const ctaUrl = settings.ctaUrl || `/${tenantSlug}/shop`

  const imageElement = (
    <div className="relative aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden bg-gray-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title || 'Image'}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}20, ${tenant.accentColor || '#3b82f6'}20)`,
          }}
        >
          <ImageIcon className="w-16 h-16 text-gray-300" />
        </div>
      )}
    </div>
  )

  const contentElement = (
    <div className="flex flex-col justify-center">
      {title && (
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">
          {title}
        </h2>
      )}
      {content && (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Rich text content is sanitized with sanitizeHtml() before rendering
        <div
          className="text-lg text-gray-600 leading-relaxed mb-8 prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      )}
      {ctaText && (
        <div>
          <Link
            href={ctaUrl}
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
          >
            {ctaText} <span className="ml-2">→</span>
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {imagePosition === 'left' ? (
          <>
            {imageElement}
            {contentElement}
          </>
        ) : (
          <>
            {contentElement}
            {imageElement}
          </>
        )}
      </div>
    </div>
  )
}
