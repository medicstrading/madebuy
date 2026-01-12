import Image from 'next/image'
import { Instagram, Facebook } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'
import { sanitizeHtml } from '@/lib/sanitize'

export function AboutSection({ settings, tenant }: SectionProps) {
  const title = settings.title || 'About Us'
  const content = settings.aboutContent || settings.subtitle || tenant.description
  const imageUrl = settings.aboutImage
  const showSocialLinks = settings.showSocialLinks ?? true

  const hasSocialLinks = tenant.instagram || tenant.facebook || tenant.tiktok

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Image */}
        {imageUrl && (
          <div className="relative aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Content */}
        <div className={!imageUrl ? 'text-center max-w-2xl mx-auto' : ''}>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">
            {title}
          </h2>

          {content && (
            <div
              className="text-lg text-gray-600 leading-relaxed mb-8 prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
            />
          )}

          {/* Social links */}
          {showSocialLinks && hasSocialLinks && (
            <div className="flex gap-4">
              {tenant.instagram && (
                <a
                  href={`https://instagram.com/${tenant.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="text-sm font-medium">Instagram</span>
                </a>
              )}
              {tenant.facebook && (
                <a
                  href={`https://facebook.com/${tenant.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="text-sm font-medium">Facebook</span>
                </a>
              )}
            </div>
          )}

          {/* Location */}
          {tenant.location && (
            <p className="mt-6 text-gray-500">
              📍 {tenant.location}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
