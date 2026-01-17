/**
 * Blog Post Types
 *
 * Type definitions for the blog system supporting rich text content,
 * SEO optimization, and integration with the publishing workflow.
 */

export interface BlogPost {
  id: string // nanoid()
  tenantId: string

  // Content
  title: string // Post title
  slug: string // URL-friendly slug (auto-generated from title)
  excerpt?: string // Short description (150-300 chars)
  content: string // Rich text HTML from TipTap

  // Media
  coverImageId?: string // Featured image (from media library)

  // SEO
  metaTitle?: string // Optional custom meta title (default: title)
  metaDescription?: string // Meta description for search engines

  // Organization
  tags: string[] // Categories/tags for filtering

  // Publishing
  status: 'draft' | 'published'
  publishedAt?: Date // When published (null for drafts)

  // Analytics
  views: number // View counter

  // Publishing Source
  publishRecordId?: string // Link to PublishRecord if published via publish flow

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a new blog post
 */
export interface CreateBlogPostInput {
  title: string
  content: string
  excerpt?: string
  coverImageId?: string
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  status?: 'draft' | 'published'
  publishRecordId?: string
}

/**
 * Input for updating an existing blog post
 */
export interface UpdateBlogPostInput {
  title?: string
  slug?: string
  content?: string
  excerpt?: string
  coverImageId?: string
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  status?: 'draft' | 'published'
}

/**
 * Blog configuration in tenant's website design
 */
export interface BlogConfig {
  enabled: boolean
  title?: string // Default: "Blog"
  description?: string // Subtitle for blog page
}

/**
 * Blog-specific publishing configuration
 * Used when 'website-blog' is selected as a publishing destination
 */
export interface BlogPublishConfig {
  title: string // Blog post title
  excerpt?: string // Blog excerpt
  tags: string[] // Blog tags
  metaTitle?: string // SEO meta title
  metaDescription?: string // SEO meta description
}
