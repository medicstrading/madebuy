import { blog, media } from '@madebuy/db'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { requireTenant } from '@/lib/tenant'
import { formatDate } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const blogTitle = tenant.websiteDesign?.blog?.title || 'Blog'
  const blogDescription =
    tenant.websiteDesign?.blog?.description ||
    `Read the latest from ${tenant.businessName}`

  return {
    title: `${blogTitle} - ${tenant.businessName}`,
    description: blogDescription,
  }
}

export default async function BlogIndexPage({
  params,
}: {
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)

  // Check if blog is enabled
  if (!tenant.websiteDesign?.blog?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Blog Not Available
          </h1>
          <p className="mt-2 text-gray-600">This blog is currently disabled.</p>
          <Link
            href={`/${params.tenant}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const posts = await blog.listBlogPosts(tenant.id, {
    status: 'published',
    limit: 50,
  })

  const blogTitle = tenant.websiteDesign?.blog?.title || 'Blog'
  const blogDescription = tenant.websiteDesign?.blog?.description

  // Fetch logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Build structured data for blog index
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'
  const blogUrl = `${siteUrl}/${params.tenant}/blog`

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': blogUrl,
    name: blogTitle,
    description: blogDescription || `Blog from ${tenant.businessName}`,
    url: blogUrl,
    publisher: {
      '@type': 'Organization',
      name: tenant.businessName,
      logo: logoUrl
        ? {
            '@type': 'ImageObject',
            url: logoUrl,
          }
        : undefined,
    },
    blogPost: posts.slice(0, 10).map((post) => ({
      '@type': 'BlogPosting',
      '@id': `${siteUrl}/${params.tenant}/blog/${post.slug}`,
      headline: post.title,
      description: post.excerpt || undefined,
      datePublished:
        post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      url: `${siteUrl}/${params.tenant}/blog/${post.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Structured data for SEO - JSON.stringify ensures safe output
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
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

              <Link
                href={`/${params.tenant}`}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Shop
              </Link>
            </div>
          </div>
        </header>

        {/* Blog Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {blogTitle}
            </h1>
            {blogDescription && (
              <p className="text-xl text-gray-600 max-w-3xl">
                {blogDescription}
              </p>
            )}
          </div>
        </div>

        {/* Blog Posts */}
        <div className="container mx-auto px-4 py-12">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Posts Yet
              </h2>
              <p className="text-gray-600">Check back soon for new content!</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {post.coverImageId && (
                    <Link href={`/${params.tenant}/blog/${post.slug}`}>
                      <div className="relative aspect-video bg-gray-200">
                        <CoverImage
                          tenantId={tenant.id}
                          mediaId={post.coverImageId}
                          alt={post.title}
                        />
                      </div>
                    </Link>
                  )}

                  <div className="p-6">
                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <Link href={`/${params.tenant}/blog/${post.slug}`}>
                      <h2 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(post.publishedAt || post.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.ceil(post.content.split(' ').length / 200)} min
                        read
                      </div>
                    </div>

                    {/* Read More Link */}
                    <Link
                      href={`/${params.tenant}/blog/${post.slug}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Read More
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

async function CoverImage({
  tenantId,
  mediaId,
  alt,
}: {
  tenantId: string
  mediaId: string
  alt: string
}) {
  const mediaItem = await media.getMedia(tenantId, mediaId)
  if (!mediaItem) return null

  return (
    <Image
      src={mediaItem.variants.large?.url || mediaItem.variants.original.url}
      alt={alt}
      fill
      className="object-cover"
    />
  )
}
