import type {
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import { getDatabase } from '../client'

/**
 * Ensure MongoDB indexes exist for blog posts collection
 */
export async function ensureBlogIndexes(): Promise<void> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  // Index for querying by tenant, status, and sorting by publishedAt
  await collection.createIndex({ tenantId: 1, status: 1, publishedAt: -1 })

  // Unique index for tenant + slug
  await collection.createIndex({ tenantId: 1, slug: 1 }, { unique: true })

  // Index for tag filtering
  await collection.createIndex({ tags: 1 })

  // Index for sorting by published date
  await collection.createIndex({ publishedAt: -1 })
}

/**
 * Generate a unique slug for a blog post
 */
export async function generateUniqueSlug(
  tenantId: string,
  title: string,
): Promise<string> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  const baseSlug = slugify(title, { lower: true, strict: true })
  let slug = baseSlug
  let counter = 1

  // Keep trying until we find a unique slug
  while (await collection.findOne({ tenantId, slug })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

/**
 * Create a new blog post
 */
export async function createBlogPost(
  tenantId: string,
  input: CreateBlogPostInput,
): Promise<BlogPost> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  const slug = await generateUniqueSlug(tenantId, input.title)

  const blogPost: BlogPost = {
    id: nanoid(),
    tenantId,
    title: input.title,
    slug,
    content: input.content,
    excerpt: input.excerpt,
    coverImageId: input.coverImageId,
    tags: input.tags || [],
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    status: input.status || 'draft',
    publishedAt: input.status === 'published' ? new Date() : undefined,
    views: 0,
    publishRecordId: input.publishRecordId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await collection.insertOne(blogPost)
  return blogPost
}

/**
 * Get a blog post by ID
 */
export async function getBlogPost(
  tenantId: string,
  id: string,
): Promise<BlogPost | null> {
  const db = await getDatabase()
  return (await db
    .collection('blog_posts')
    .findOne({ tenantId, id })) as BlogPost | null
}

/**
 * Get a blog post by slug
 */
export async function getBlogPostBySlug(
  tenantId: string,
  slug: string,
): Promise<BlogPost | null> {
  const db = await getDatabase()
  return (await db
    .collection('blog_posts')
    .findOne({ tenantId, slug })) as BlogPost | null
}

/**
 * List blog posts with optional filters
 */
export async function listBlogPosts(
  tenantId: string,
  options?: {
    status?: 'draft' | 'published'
    tags?: string[]
    limit?: number
    offset?: number
  },
): Promise<BlogPost[]> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  const query: any = { tenantId }

  if (options?.status) {
    query.status = options.status
  }

  if (options?.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags }
  }

  const results = await collection
    .find(query)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(options?.limit || 50)
    .skip(options?.offset || 0)
    .toArray()

  return results as any[]
}

/**
 * Update a blog post
 */
export async function updateBlogPost(
  tenantId: string,
  id: string,
  input: UpdateBlogPostInput,
): Promise<BlogPost | null> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  const updates: any = {
    ...input,
    updatedAt: new Date(),
  }

  // If publishing a draft, set publishedAt
  if (input.status === 'published') {
    const existing = await collection.findOne({ tenantId, id })
    if (existing && (existing as any).status === 'draft') {
      updates.publishedAt = new Date()
    }
  }

  // If slug is being changed, ensure uniqueness
  if (input.slug) {
    const slugExists = await collection.findOne({
      tenantId,
      slug: input.slug,
      id: { $ne: id },
    })
    if (slugExists) {
      throw new Error('Slug already exists')
    }
  }

  await collection.updateOne({ tenantId, id }, { $set: updates })

  return getBlogPost(tenantId, id)
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(
  tenantId: string,
  id: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('blog_posts').deleteOne({ tenantId, id })
}

/**
 * Increment view count for a blog post
 */
export async function incrementBlogPostViews(
  tenantId: string,
  id: string,
): Promise<void> {
  const db = await getDatabase()
  await db
    .collection('blog_posts')
    .updateOne({ tenantId, id }, { $inc: { views: 1 } })
}

/**
 * Get count of blog posts
 */
export async function countBlogPosts(
  tenantId: string,
  status?: 'draft' | 'published',
): Promise<number> {
  const db = await getDatabase()
  const collection = db.collection('blog_posts')

  const query: any = { tenantId }
  if (status) {
    query.status = status
  }

  return collection.countDocuments(query)
}
