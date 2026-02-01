import { blog, media } from '@madebuy/db'
// Note: Blog content is sanitized when saved via the admin editor
import { ArrowLeft, Calendar, Clock, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireTenant } from '@/lib/tenant'
import { formatDate } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const post = await blog.getBlogPostBySlug(tenant.id, params.slug)

  if (!post || post.status !== 'published') {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.metaTitle || `${post.title} - ${tenant.businessName}`,
    description: post.metaDescription || post.excerpt || post.title,
    openGraph: post.coverImageId
      ? {
          images: [
            {
              url: `/api/media/${post.coverImageId}`,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ],
        }
      : undefined,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)

  // Check if blog is enabled
  if (!tenant.websiteDesign?.blog?.enabled) {
    return notFound()
  }

  const post = await blog.getBlogPostBySlug(tenant.id, params.slug)

  if (!post || post.status !== 'published') {
    return notFound()
  }

  // Increment view count
  await blog.incrementBlogPostViews(tenant.id, post.id)

  // Fetch logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Fetch cover image if exists
  let coverImageUrl: string | null = null
  if (post.coverImageId) {
    const coverMedia = await media.getMedia(tenant.id, post.coverImageId)
    coverImageUrl =
      coverMedia?.variants.large?.url ||
      coverMedia?.variants.original.url ||
      null
  }

  const readingTime = Math.ceil(post.content.split(' ').length / 200)

  // Build structured data for blog post
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'
  const postUrl = `${siteUrl}/${params.tenant}/blog/${params.slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': postUrl,
    headline: post.title,
    description: post.excerpt || post.title,
    image: coverImageUrl || undefined,
    datePublished:
      post.publishedAt?.toISOString() || post.createdAt.toISOString(),
    dateModified: post.updatedAt?.toISOString() || post.createdAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: tenant.businessName,
      url: `${siteUrl}/${params.tenant}`,
    },
    publisher: {
      '@type': 'Organization',
      name: tenant.businessName,
      url: `${siteUrl}/${params.tenant}`,
      logo: logoUrl
        ? {
            '@type': 'ImageObject',
            url: logoUrl,
          }
        : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    wordCount: post.content.split(' ').length,
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Structured data for SEO - JSON.stringify ensures safe output
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link
                href={`/${params.tenant}`}
                className="flex items-center gap-4"
              >
                {logoUrl && (
                  <div className="relative h-12 w-auto">
                    <Image
                      src={logoUrl}
                      alt={tenant.businessName}
                      width={150}
                      height={48}
                      className="h-full w-auto object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tenant.businessName}
                  </h1>
                  {tenant.description && (
                    <p className="text-sm text-gray-600">
                      {tenant.description}
                    </p>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <Link
                  href={`/${params.tenant}/blog`}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Back to Blog
                </Link>
                <Link
                  href={`/${params.tenant}`}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Shop
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Article */}
        <article className="bg-white">
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            {/* Back Link */}
            <Link
              href={`/${params.tenant}/blog`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pb-8 border-b border-gray-200 mb-8">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt || post.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readingTime} min read
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {post.views + 1} views
              </div>
            </div>

            {/* Cover Image */}
            {coverImageUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-12 bg-gray-200">
                <Image
                  src={coverImageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-gray-700
              prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700
              prose-img:rounded-lg prose-img:shadow-md
              prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-gray-800
              prose-pre:bg-gray-900 prose-pre:text-gray-100"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Blog content is sanitized when saved via admin editor
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags (bottom) */}
            {post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share/Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${params.tenant}/blog`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  More Posts
                </Link>

                <Link
                  href={`/${params.tenant}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Visit Shop
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  )
}
