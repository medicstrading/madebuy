'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FileText, Clock } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

export function BlogPreview({ settings, tenant, tenantSlug, blogPosts }: SectionProps) {
  const title = settings.title || 'From the Blog'
  const subtitle = settings.subtitle
  const postLimit = settings.postLimit || 3
  const showExcerpt = settings.showExcerpt ?? true
  const showDate = settings.showDate ?? true
  const layout = settings.layout || 'grid'

  const displayPosts = blogPosts?.filter((p) => p.status === 'published').slice(0, postLimit) || []

  if (displayPosts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            {title}
          </h2>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Coming soon...</p>
        </div>
      </div>
    )
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

      {/* Posts grid */}
      <div className={`grid ${layout === 'featured' ? 'lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-8`}>
        {displayPosts.map((post, index) => {
          const href = `/${tenantSlug}/blog/${post.slug}`
          const isFeature = layout === 'featured' && index === 0

          return (
            <Link
              key={post.id}
              href={href}
              className={`group ${isFeature ? 'lg:row-span-2' : ''}`}
            >
              <article className="h-full bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                {/* Cover Image */}
                <div className={`relative bg-gray-100 ${isFeature ? 'aspect-[16/10]' : 'aspect-[16/9]'}`}>
                  {/* Note: coverImageId needs to be resolved to URL by parent component */}
                  {(post as { coverImageUrl?: string }).coverImageUrl ? (
                    <Image
                      src={(post as { coverImageUrl?: string }).coverImageUrl!}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes={isFeature ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}80, ${tenant.accentColor || '#3b82f6'}80)`,
                      }}
                    >
                      <FileText className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Meta */}
                  {showDate && post.publishedAt && (
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <time dateTime={new Date(post.publishedAt).toISOString()}>
                        {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      {/* Read time calculated from content if available */}
                      {post.content && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min read
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className={`font-serif text-gray-900 group-hover:text-primary transition-colors ${
                      isFeature ? 'text-2xl md:text-3xl' : 'text-xl'
                    }`}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  {showExcerpt && post.excerpt && (
                    <p className="mt-3 text-gray-600 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}

                  {/* Read more */}
                  <span
                    className="inline-block mt-4 text-sm font-medium"
                    style={{ color: tenant.primaryColor }}
                  >
                    Read more →
                  </span>
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {/* View all link */}
      <div className="text-center mt-12">
        <Link
          href={`/${tenantSlug}/blog`}
          className="inline-flex items-center px-6 py-3 rounded-lg font-medium border-2 transition-all duration-200 hover:scale-105"
          style={{
            borderColor: tenant.primaryColor || '#3b82f6',
            color: tenant.primaryColor || '#3b82f6',
          }}
        >
          View All Posts <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  )
}
