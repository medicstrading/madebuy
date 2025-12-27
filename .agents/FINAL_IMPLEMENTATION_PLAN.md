# MadeBuy Custom Content & Blog Integration - Final Implementation Plan
**Project Manager Review - December 27, 2025**
**Status: Ready for Implementation - All 4 Priorities**

---

## Executive Summary

This plan integrates blog publishing into the existing MadeBuy social media publishing system, following the proven multi-platform selection pattern from sarasite. The blog will appear as a publishing destination alongside Instagram, Facebook, TikTok, Pinterest, and YouTube, allowing users to publish AI-generated content to their website blog and social media simultaneously.

### Key Findings from Project Analysis

**Sarasite Pattern (Proven):**
- ✅ 5-step PostWorkflow: Select Piece → Select Media → Choose Platforms → Edit Content → Preview & Publish
- ✅ Multi-platform checkbox grid with "Website" as selectable destination
- ✅ AI generates platform-specific captions with OpenAI GPT-4
- ✅ Platform-specific editing allows custom content per destination
- ✅ PublishRecord stores platformCaptions and platformHashtags
- ✅ Single publish action distributes to all selected platforms

**MadeBuy Current State:**
- ✅ Late.dev integration for 5 social platforms
- ✅ PublishComposer with 3-column layout
- ✅ AI caption generation via `/api/ai/caption`
- ✅ PublishRecord with platforms array and status tracking
- ✅ Image variants optimized for each platform
- ✅ Execute endpoint at `/api/publish/[id]/execute`

**Integration Strategy:**
- Extend existing PublishRecord to support 'website-blog' as a platform
- Add blog-specific fields when blog is selected
- Enhance execute endpoint to handle blog publishing alongside social
- Reuse AI-generated captions and media for blog posts
- Enable/disable blog destination based on tenant's website design settings

---

## PRIORITY 1: Blog System with Publish Integration (Week 1-3)

### Overview
Implement blog as a first-class publishing destination that integrates seamlessly with the existing social media publishing flow.

---

### Phase 1.1: Database Schema & Types (Days 1-2)

#### 1. Blog Post Schema
**File:** `/packages/shared/src/types/blog.ts`

```typescript
export interface BlogPost {
  id: string                    // nanoid()
  tenantId: string

  // Content
  title: string                 // Post title
  slug: string                  // URL-friendly slug (auto-generated from title)
  excerpt?: string              // Short description (150-300 chars)
  content: string               // Rich text HTML from TipTap

  // Media
  coverImageId?: string         // Featured image (from media library)

  // SEO
  metaTitle?: string            // Optional custom meta title (default: title)
  metaDescription?: string      // Meta description for search engines

  // Organization
  tags: string[]                // Categories/tags for filtering

  // Publishing
  status: 'draft' | 'published'
  publishedAt?: Date            // When published (null for drafts)

  // Analytics
  views: number                 // View counter

  // Publishing Source
  publishRecordId?: string      // Link to PublishRecord if published via publish flow

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// For creating blog posts
export interface CreateBlogPostInput {
  title: string
  content: string
  excerpt?: string
  coverImageId?: string
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  status?: 'draft' | 'published'
}

// For updating blog posts
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
```

#### 2. Extend PublishRecord Types
**File:** `/packages/shared/src/types/publish.ts`

```typescript
// Add 'website-blog' to SocialPlatform union
export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'pinterest'
  | 'youtube'
  | 'website-blog'  // NEW

// Add blog-specific configuration
export interface BlogPublishConfig {
  title: string                 // Blog post title
  excerpt?: string              // Blog excerpt
  tags: string[]                // Blog tags
  metaTitle?: string            // SEO meta title
  metaDescription?: string      // SEO meta description
}

// Extend PublishRecord interface
export interface PublishRecord {
  id: string
  tenantId: string

  // Content References
  mediaIds: string[]
  pieceIds?: string[]

  // Standard Content (for social platforms)
  caption: string
  hashtags: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>

  // Blog-Specific Content (NEW)
  blogConfig?: BlogPublishConfig  // Only present if 'website-blog' in platforms

  // Publishing Configuration
  platforms: SocialPlatform[]     // Now includes 'website-blog'
  scheduledFor?: Date

  // Status Tracking
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  results: PlatformResult[]

  // Blog Post Reference (NEW)
  blogPostId?: string             // Link to created BlogPost if published to blog

  // Timestamps
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}
```

#### 3. MongoDB Collections & Indexes

**Create blog_posts collection:**

```typescript
// packages/db/src/repositories/blog.ts

import { Db, ObjectId } from 'mongodb'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import type { BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from '@madebuy/shared'

export const blog = {
  // Create indexes on first run
  async ensureIndexes(db: Db) {
    const collection = db.collection('blog_posts')

    await collection.createIndex({ tenantId: 1, status: 1, publishedAt: -1 })
    await collection.createIndex({ tenantId: 1, slug: 1 }, { unique: true })
    await collection.createIndex({ tags: 1 })
    await collection.createIndex({ publishedAt: -1 })
  },

  // Create blog post
  async createBlogPost(tenantId: string, input: CreateBlogPostInput): Promise<BlogPost> {
    const db = getDatabase()
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await collection.insertOne(blogPost)
    return blogPost
  },

  // Generate unique slug
  async generateUniqueSlug(tenantId: string, title: string): Promise<string> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')

    let baseSlug = slugify(title, { lower: true, strict: true })
    let slug = baseSlug
    let counter = 1

    while (await collection.findOne({ tenantId, slug })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  },

  // Get blog post by ID
  async getBlogPost(tenantId: string, id: string): Promise<BlogPost | null> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')
    return collection.findOne({ tenantId, id }) as Promise<BlogPost | null>
  },

  // Get blog post by slug
  async getBlogPostBySlug(tenantId: string, slug: string): Promise<BlogPost | null> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')
    return collection.findOne({ tenantId, slug }) as Promise<BlogPost | null>
  },

  // List blog posts
  async listBlogPosts(tenantId: string, options?: {
    status?: 'draft' | 'published'
    tags?: string[]
    limit?: number
    offset?: number
  }): Promise<BlogPost[]> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')

    const query: any = { tenantId }
    if (options?.status) query.status = options.status
    if (options?.tags?.length) query.tags = { $in: options.tags }

    return collection
      .find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(options?.limit || 50)
      .skip(options?.offset || 0)
      .toArray() as Promise<BlogPost[]>
  },

  // Update blog post
  async updateBlogPost(tenantId: string, id: string, input: UpdateBlogPostInput): Promise<BlogPost | null> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')

    const updates: any = {
      ...input,
      updatedAt: new Date(),
    }

    // If publishing, set publishedAt
    if (input.status === 'published') {
      const existing = await collection.findOne({ tenantId, id })
      if (existing && existing.status === 'draft') {
        updates.publishedAt = new Date()
      }
    }

    // If slug is being changed, ensure uniqueness
    if (input.slug) {
      const slugExists = await collection.findOne({
        tenantId,
        slug: input.slug,
        id: { $ne: id }
      })
      if (slugExists) {
        throw new Error('Slug already exists')
      }
    }

    await collection.updateOne(
      { tenantId, id },
      { $set: updates }
    )

    return this.getBlogPost(tenantId, id)
  },

  // Delete blog post
  async deleteBlogPost(tenantId: string, id: string): Promise<void> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')
    await collection.deleteOne({ tenantId, id })
  },

  // Increment view count
  async incrementViews(tenantId: string, id: string): Promise<void> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')
    await collection.updateOne(
      { tenantId, id },
      { $inc: { views: 1 } }
    )
  },

  // Get total count
  async countBlogPosts(tenantId: string, status?: 'draft' | 'published'): Promise<number> {
    const db = getDatabase()
    const collection = db.collection('blog_posts')
    const query: any = { tenantId }
    if (status) query.status = status
    return collection.countDocuments(query)
  },
}
```

**Install Dependencies:**
```bash
pnpm add slugify
pnpm add -D @types/slugify
```

---

### Phase 1.2: Blog Management UI (Days 3-5)

#### 4. Blog List Page
**File:** `/apps/admin/src/app/(dashboard)/dashboard/blog/page.tsx`

```typescript
import { getCurrentTenant } from '@/lib/session'
import { blog } from '@madebuy/db'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default async function BlogPage() {
  const tenant = await getCurrentTenant()

  // Check if blog is enabled
  const blogEnabled = tenant.websiteDesign?.blog?.enabled || false

  if (!blogEnabled) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Blog</h1>
        <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Blog Not Enabled</h3>
          <p className="mt-2 text-gray-600">
            Enable the blog feature in Website Design settings to start publishing blog posts.
          </p>
          <Link href="/dashboard/website-design">
            <Button className="mt-4">Go to Website Design</Button>
          </Link>
        </div>
      </div>
    )
  }

  const posts = await blog.listBlogPosts(tenant.id, { limit: 50 })
  const draftCount = await blog.countBlogPosts(tenant.id, 'draft')
  const publishedCount = await blog.countBlogPosts(tenant.id, 'published')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
          <p className="mt-1 text-gray-600">
            Manage your website blog posts
          </p>
        </div>
        <Link href="/dashboard/blog/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Total Posts</div>
          <div className="mt-1 text-2xl font-bold">{posts.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Published</div>
          <div className="mt-1 text-2xl font-bold">{publishedCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Drafts</div>
          <div className="mt-1 text-2xl font-bold">{draftCount}</div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="mt-6 overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{post.title}</div>
                      {post.excerpt && (
                        <div className="text-sm text-gray-500">{post.excerpt.substring(0, 100)}...</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    post.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="mr-1 h-4 w-4" />
                    {post.views}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {post.publishedAt
                    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
                    : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                  }
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <Link href={`/dashboard/blog/${post.id}`} className="text-blue-600 hover:text-blue-900">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No blog posts yet</h3>
            <p className="mt-2 text-gray-600">
              Get started by creating your first blog post.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 5. Blog Editor Page (TipTap Integration)
**File:** `/apps/admin/src/app/(dashboard)/dashboard/blog/[id]/page.tsx`

```typescript
import { getCurrentTenant } from '@/lib/session'
import { blog } from '@madebuy/db'
import { BlogEditor } from '@/components/blog/BlogEditor'
import { notFound } from 'next/navigation'

export default async function BlogEditPage({ params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant()

  let post = null
  if (params.id !== 'new') {
    post = await blog.getBlogPost(tenant.id, params.id)
    if (!post) {
      notFound()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogEditor post={post} tenantId={tenant.id} />
    </div>
  )
}
```

**File:** `/apps/admin/src/components/blog/BlogEditor.tsx` (Client Component)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/blog/RichTextEditor'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Save, Eye, Globe } from 'lucide-react'
import type { BlogPost } from '@madebuy/shared'

interface BlogEditorProps {
  post: BlogPost | null
  tenantId: string
}

export function BlogEditor({ post, tenantId }: BlogEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(post?.title || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [coverImageId, setCoverImageId] = useState(post?.coverImageId)
  const [tags, setTags] = useState(post?.tags.join(', ') || '')
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription || '')

  async function saveDraft() {
    setSaving(true)
    try {
      const data = {
        title,
        excerpt,
        content,
        coverImageId,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        metaTitle,
        metaDescription,
        status: 'draft' as const,
      }

      if (post) {
        await fetch(`/api/blog/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        const response = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const newPost = await response.json()
        router.push(`/dashboard/blog/${newPost.id}`)
      }

      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setSaving(true)
    try {
      const data = {
        title,
        excerpt,
        content,
        coverImageId,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        metaTitle,
        metaDescription,
        status: 'published' as const,
      }

      if (post) {
        await fetch(`/api/blog/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      router.push('/dashboard/blog')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {post ? 'Edit Post' : 'New Post'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={publish} disabled={saving || !title || !content}>
            <Globe className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="space-y-6 rounded-lg border bg-white p-6">
        {/* Title */}
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            className="mt-1"
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="text-sm font-medium">Excerpt</label>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short description for post preview..."
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="text-sm font-medium">Cover Image</label>
          <MediaPicker
            selected={coverImageId}
            onSelect={setCoverImageId}
            className="mt-1"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-sm font-medium">Content</label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            className="mt-1"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium">Tags</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="crafts, jewelry, handmade"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated tags</p>
        </div>

        {/* SEO Section */}
        <div className="border-t pt-6">
          <h3 className="mb-4 font-medium">SEO Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Meta Title</label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || 'Post title'}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use post title. Max 60 characters.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Meta Description</label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Description for search engines..."
                rows={2}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Max 160 characters for optimal display in search results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Install TipTap Dependencies:**
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-text-align
```

#### 6. TipTap Rich Text Editor Component
**File:** `/apps/admin/src/components/blog/RichTextEditor.tsx`

```typescript
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
}

export function RichTextEditor({ content, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your blog post content here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className={`rounded-lg border ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b bg-gray-50 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-gray-200' : ''}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'bg-gray-200' : ''}
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="mx-2 w-px bg-gray-300" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="mx-2 w-px bg-gray-300" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="mx-2 w-px bg-gray-300" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('Enter image URL:')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="mx-2 w-px bg-gray-300" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 focus:outline-none"
      />
    </div>
  )
}
```

---

### Phase 1.3: Blog-Publish Integration (Days 6-8)

#### 7. Update Publish Composer to Include Blog
**File:** `/apps/admin/src/components/publish/PublishComposer.tsx`

Add blog to platform selection:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Instagram, Facebook, Video, Image as ImageIcon,
  Youtube, FileText, Calendar, Sparkles
} from 'lucide-react'
import type { SocialPlatform, SocialConnection } from '@madebuy/shared'

interface PublishComposerProps {
  connections: SocialConnection[]
  blogEnabled: boolean  // NEW: Pass from parent
}

export function PublishComposer({ connections, blogEnabled }: PublishComposerProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
  const [selectedMedia, setSelectedMedia] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [scheduledFor, setScheduledFor] = useState<string>('')
  const [isScheduled, setIsScheduled] = useState(false)

  // Blog-specific fields (NEW)
  const [blogTitle, setBlogTitle] = useState('')
  const [blogExcerpt, setBlogExcerpt] = useState('')
  const [blogTags, setBlogTags] = useState('')

  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Available platforms (including blog if enabled)
  const availablePlatforms = [
    ...connections.map(c => c.platform),
    ...(blogEnabled ? ['website-blog' as SocialPlatform] : [])
  ]

  // Platform configs for display
  const platformConfigs = {
    instagram: { name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    facebook: { name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    tiktok: { name: 'TikTok', icon: Video, color: 'bg-black' },
    pinterest: { name: 'Pinterest', icon: ImageIcon, color: 'bg-red-600' },
    youtube: { name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    'website-blog': { name: 'Website Blog', icon: FileText, color: 'bg-green-600' },  // NEW
  }

  async function generateCaption() {
    if (selectedMedia.length === 0) return

    setGeneratingCaption(true)
    try {
      const response = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: selectedMedia,
          style: 'professional',
          includeHashtags: true,
        }),
      })

      const data = await response.json()
      setCaption(data.caption)

      // Auto-populate blog title from caption if blog is selected
      if (selectedPlatforms.includes('website-blog') && !blogTitle) {
        const firstLine = data.caption.split('\n')[0]
        setBlogTitle(firstLine.substring(0, 100))
      }
    } finally {
      setGeneratingCaption(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const publishData = {
        mediaIds: selectedMedia,
        caption,
        hashtags: [],
        platforms: selectedPlatforms,
        scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor) : undefined,
        // Blog-specific config (NEW)
        ...(selectedPlatforms.includes('website-blog') && {
          blogConfig: {
            title: blogTitle || caption.split('\n')[0].substring(0, 100),
            excerpt: blogExcerpt,
            tags: blogTags.split(',').map(t => t.trim()).filter(Boolean),
          }
        }),
      }

      // Create publish record
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData),
      })

      const publishRecord = await response.json()

      // Execute immediately if not scheduled
      if (!isScheduled) {
        await fetch(`/api/publish/${publishRecord.id}/execute`, {
          method: 'POST',
        })
      }

      // Redirect to publish list
      window.location.href = '/dashboard/publish'
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column: Media Selection */}
      <div className="col-span-4">
        {/* ... existing media picker ... */}
      </div>

      {/* Middle Column: Caption Editor */}
      <div className="col-span-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Caption</label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateCaption}
              disabled={selectedMedia.length === 0 || generatingCaption}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generatingCaption ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            placeholder="Write your caption or use AI to generate one..."
            className="mt-2"
          />
        </div>

        {/* Blog-Specific Fields (NEW) - Only show if blog is selected */}
        {selectedPlatforms.includes('website-blog') && (
          <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="font-medium text-green-900">Blog Post Settings</h3>

            <div>
              <label className="text-sm font-medium text-green-900">Post Title</label>
              <Input
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                placeholder="Enter blog post title..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-green-900">Excerpt</label>
              <Textarea
                value={blogExcerpt}
                onChange={(e) => setBlogExcerpt(e.target.value)}
                rows={2}
                placeholder="Short description for blog preview..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-green-900">Tags</label>
              <Input
                value={blogTags}
                onChange={(e) => setBlogTags(e.target.value)}
                placeholder="crafts, jewelry, handmade"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-green-700">Comma-separated</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Platform Selection & Publishing */}
      <div className="col-span-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Select Platforms</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {availablePlatforms.map((platform) => {
              const config = platformConfigs[platform]
              const Icon = config.icon
              const isSelected = selectedPlatforms.includes(platform)

              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPlatforms(prev => prev.filter(p => p !== platform))
                    } else {
                      setSelectedPlatforms(prev => [...prev, platform])
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`rounded p-1.5 text-white ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{config.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scheduling */}
        <div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="schedule"
              checked={isScheduled}
              onCheckedChange={(checked) => setIsScheduled(!!checked)}
            />
            <label htmlFor="schedule" className="text-sm font-medium">
              Schedule for later
            </label>
          </div>

          {isScheduled && (
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        {/* Publish Button */}
        <Button
          onClick={handlePublish}
          disabled={
            publishing ||
            selectedPlatforms.length === 0 ||
            selectedMedia.length === 0 ||
            !caption ||
            (selectedPlatforms.includes('website-blog') && !blogTitle)
          }
          className="w-full"
        >
          {publishing ? 'Publishing...' : isScheduled ? 'Schedule' : 'Publish Now'}
        </Button>
      </div>
    </div>
  )
}
```

#### 8. Update Publish Create Page
**File:** `/apps/admin/src/app/(dashboard)/dashboard/publish/new/page.tsx`

```typescript
import { getCurrentTenant } from '@/lib/session'
import { PublishComposer } from '@/components/publish/PublishComposer'

export default async function PublishNewPage() {
  const tenant = await getCurrentTenant()

  // Check if blog is enabled
  const blogEnabled = tenant.websiteDesign?.blog?.enabled || false

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Post</h1>
        <p className="mt-1 text-gray-600">
          Publish to social media{blogEnabled ? ' and your blog' : ''}
        </p>
      </div>

      <PublishComposer
        connections={tenant.socialConnections || []}
        blogEnabled={blogEnabled}
      />
    </div>
  )
}
```

---

### Phase 1.4: Enhanced Publish Execute (Days 9-10)

#### 9. Update Publish Execute Endpoint
**File:** `/apps/admin/src/app/api/publish/[id]/execute/route.ts`

Enhance to handle blog publishing:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { publish as publishRepo, blog as blogRepo, media as mediaRepo } from '@madebuy/db'
import { lateClient } from '@madebuy/social'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    const publishRecord = await publishRepo.getPublishRecord(tenant.id, params.id)

    if (!publishRecord) {
      return NextResponse.json({ error: 'Publish record not found' }, { status: 404 })
    }

    if (publishRecord.status === 'published') {
      return NextResponse.json({ error: 'Already published' }, { status: 400 })
    }

    // Update status to publishing
    await publishRepo.updatePublishRecordStatus(tenant.id, params.id, 'publishing')

    const results: any[] = []

    // Get media files
    const mediaItems = await mediaRepo.getMediaByIds(tenant.id, publishRecord.mediaIds)
    const mediaUrls = mediaItems.map(m => m.variants.original.url)

    // Separate social platforms from blog
    const socialPlatforms = publishRecord.platforms.filter(p => p !== 'website-blog')
    const includeBlog = publishRecord.platforms.includes('website-blog')

    // Publish to social media platforms via Late.dev
    if (socialPlatforms.length > 0) {
      try {
        const lateResponse = await lateClient.publish({
          platforms: socialPlatforms,
          caption: publishRecord.caption,
          mediaUrls,
          scheduledFor: publishRecord.scheduledFor,
        })

        // Add results for each social platform
        for (const platform of socialPlatforms) {
          const platformResult = lateResponse.results.find(r => r.platform === platform)
          results.push({
            platform,
            status: platformResult?.status === 'published' ? 'success' : 'failed',
            postId: platformResult?.postId,
            postUrl: platformResult?.postUrl,
            error: platformResult?.error,
            publishedAt: platformResult?.status === 'published' ? new Date() : undefined,
          })
        }
      } catch (error) {
        // If Late.dev fails, mark all social platforms as failed
        for (const platform of socialPlatforms) {
          results.push({
            platform,
            status: 'failed',
            error: error.message,
          })
        }
      }
    }

    // Publish to blog (NEW)
    if (includeBlog && publishRecord.blogConfig) {
      try {
        // Create blog post
        const blogPost = await blogRepo.createBlogPost(tenant.id, {
          title: publishRecord.blogConfig.title,
          excerpt: publishRecord.blogConfig.excerpt,
          content: publishRecord.caption, // Use caption as content (can be enhanced with rich text)
          coverImageId: mediaItems[0]?.id, // Use first media as cover
          tags: publishRecord.blogConfig.tags,
          metaTitle: publishRecord.blogConfig.metaTitle,
          metaDescription: publishRecord.blogConfig.metaDescription,
          status: 'published',
        })

        // Link blog post to publish record
        await publishRepo.updatePublishRecord(tenant.id, params.id, {
          blogPostId: blogPost.id,
        })

        // Add success result
        results.push({
          platform: 'website-blog',
          status: 'success',
          postId: blogPost.id,
          postUrl: `/${tenant.slug}/blog/${blogPost.slug}`,
          publishedAt: new Date(),
        })
      } catch (error) {
        results.push({
          platform: 'website-blog',
          status: 'failed',
          error: error.message,
        })
      }
    }

    // Update publish record with results
    for (const result of results) {
      await publishRepo.addPublishResult(tenant.id, params.id, result)
    }

    // Determine final status
    const allSuccess = results.every(r => r.status === 'success')
    const finalStatus = allSuccess ? 'published' : 'failed'

    await publishRepo.updatePublishRecordStatus(tenant.id, params.id, finalStatus, {
      publishedAt: allSuccess ? new Date() : undefined,
    })

    return NextResponse.json({ success: allSuccess, results })
  } catch (error) {
    console.error('Publish execute error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### Phase 1.5: Blog API Routes (Day 11)

#### 10. Blog CRUD API Routes

**File:** `/apps/admin/src/app/api/blog/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { blog } from '@madebuy/db'

// GET /api/blog - List blog posts
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status') as 'draft' | 'published' | undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const posts = await blog.listBlogPosts(tenant.id, { status, limit, offset })

    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/blog - Create blog post
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    const data = await request.json()

    const post = await blog.createBlogPost(tenant.id, data)

    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**File:** `/apps/admin/src/app/api/blog/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { blog } from '@madebuy/db'

// GET /api/blog/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    const post = await blog.getBlogPost(tenant.id, params.id)

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/blog/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    const data = await request.json()

    const post = await blog.updateBlogPost(tenant.id, params.id, data)

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/blog/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    await blog.deleteBlogPost(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### Phase 1.6: Storefront Blog Pages (Days 12-14)

#### 11. Blog Index Page
**File:** `/apps/web/src/app/[tenant]/blog/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { blog, media } from '@madebuy/db'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Eye, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)
  const blogTitle = tenant.websiteDesign?.blog?.title || 'Blog'
  const blogDescription = tenant.websiteDesign?.blog?.description || `Latest posts from ${tenant.businessName}`

  return {
    title: `${blogTitle} - ${tenant.businessName}`,
    description: blogDescription,
  }
}

export default async function BlogIndexPage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  // Check if blog is enabled
  if (!tenant.websiteDesign?.blog?.enabled) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">Blog Not Available</h1>
        <p className="mt-2 text-gray-600">This feature is not currently enabled.</p>
      </div>
    )
  }

  const posts = await blog.listBlogPosts(tenant.id, { status: 'published', limit: 20 })

  // Get cover images
  const postsWithImages = await Promise.all(
    posts.map(async (post) => {
      if (post.coverImageId) {
        const coverImage = await media.getMedia(tenant.id, post.coverImageId)
        return { ...post, coverImage }
      }
      return { ...post, coverImage: null }
    })
  )

  const blogTitle = tenant.websiteDesign.blog.title || 'Blog'
  const blogDescription = tenant.websiteDesign.blog.description

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">{blogTitle}</h1>
          {blogDescription && (
            <p className="mt-2 text-xl text-gray-600">{blogDescription}</p>
          )}
        </div>
      </header>

      {/* Posts Grid */}
      <main className="container mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {postsWithImages.map((post) => (
              <Link
                key={post.id}
                href={`/${params.tenant}/blog/${post.slug}`}
                className="group overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Cover Image */}
                {post.coverImage && (
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    <Image
                      src={post.coverImage.variants.large?.url || post.coverImage.variants.original.url}
                      alt={post.title}
                      width={600}
                      height={400}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold group-hover:text-primary">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-gray-600">
                      {post.excerpt}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {post.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views} views</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

#### 12. Individual Blog Post Page
**File:** `/apps/web/src/app/[tenant]/blog/[slug]/page.tsx`

```typescript
import { requireTenant } from '@/lib/tenant'
import { blog, media } from '@madebuy/db'
import Image from 'next/image'
import { Calendar, Eye, Tag, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({
  params
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const post = await blog.getBlogPostBySlug(tenant.id, params.slug)

  if (!post) return {}

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
  }
}

export default async function BlogPostPage({
  params
}: {
  params: { tenant: string; slug: string }
}) {
  const tenant = await requireTenant(params.tenant)

  if (!tenant.websiteDesign?.blog?.enabled) {
    notFound()
  }

  const post = await blog.getBlogPostBySlug(tenant.id, params.slug)

  if (!post || post.status !== 'published') {
    notFound()
  }

  // Increment view count (async, don't wait)
  blog.incrementViews(tenant.id, post.id).catch(console.error)

  // Get cover image
  let coverImage = null
  if (post.coverImageId) {
    coverImage = await media.getMedia(tenant.id, post.coverImageId)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b py-6">
        <div className="container mx-auto px-4">
          <Link
            href={`/${params.tenant}/blog`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to blog
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="container mx-auto max-w-3xl px-4 py-12">
        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {post.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{post.views} views</span>
          </div>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cover Image */}
        {coverImage && (
          <div className="mt-8 overflow-hidden rounded-lg">
            <Image
              src={coverImage.variants.large?.url || coverImage.variants.original.url}
              alt={post.title}
              width={1200}
              height={600}
              className="h-auto w-full"
            />
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <div className="mt-8 border-l-4 border-primary pl-4 text-lg italic text-gray-700">
            {post.excerpt}
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Footer */}
        <div className="mt-12 border-t pt-8">
          <Link
            href={`/${params.tenant}/blog`}
            className="inline-flex items-center text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            View all posts
          </Link>
        </div>
      </article>
    </div>
  )
}
```

---

### Phase 1.7: Enable Blog in Website Design (Day 15)

#### 13. Add Blog Toggle to Website Design
**File:** `/apps/admin/src/app/(dashboard)/dashboard/website-design/page.tsx`

Add new "Blog" tab to website design tabs:

```typescript
// Add to existing tabs
const tabs = [
  { id: 'colors', label: 'Colors' },
  { id: 'logo', label: 'Logo' },
  { id: 'banner', label: 'Banner' },
  { id: 'typography', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'content', label: 'Content' },
  { id: 'blog', label: 'Blog' },  // NEW
]
```

**File:** `/apps/admin/src/components/website-design/BlogSettingsTab.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle } from 'lucide-react'
import type { Tenant } from '@madebuy/shared'

interface BlogSettingsTabProps {
  tenant: Tenant
}

export function BlogSettingsTab({ tenant }: BlogSettingsTabProps) {
  const [enabled, setEnabled] = useState(tenant.websiteDesign?.blog?.enabled || false)
  const [title, setTitle] = useState(tenant.websiteDesign?.blog?.title || 'Blog')
  const [description, setDescription] = useState(tenant.websiteDesign?.blog?.description || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog: {
            enabled,
            title,
            description,
          },
        }),
      })

      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Blog Settings</h2>
        <p className="mt-1 text-gray-600">
          Enable and configure your website blog
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Enable Blog</h3>
            <p className="text-sm text-gray-600">
              Add a blog to your website to share updates and stories
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      {enabled && (
        <>
          {/* Blog Title */}
          <div className="rounded-lg border bg-white p-6">
            <label className="block text-sm font-medium">Blog Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will appear as the heading on your blog page
            </p>
          </div>

          {/* Blog Description */}
          <div className="rounded-lg border bg-white p-6">
            <label className="block text-sm font-medium">Blog Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Latest updates and stories from our studio..."
              rows={3}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional subtitle for your blog page
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">Blog Publishing Integration</p>
                <p className="mt-1">
                  When enabled, the blog will appear as a publishing destination in the Publish interface.
                  You can publish content to your blog and social media simultaneously.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
```

---

## Summary of Priority 1: Blog System with Publish Integration

### Deliverables:
✅ Blog post database schema with MongoDB indexes
✅ Blog CRUD repository with slug generation
✅ Blog management UI (list, create, edit pages)
✅ TipTap rich text editor with toolbar
✅ Blog publishing integration in PublishComposer
✅ Enhanced publish execute to create blog posts
✅ Blog API routes (GET, POST, PATCH, DELETE)
✅ Public blog pages on storefront (index + post)
✅ SEO optimization (meta tags, slugs)
✅ Blog enable/disable in Website Design settings

### Files Created/Modified:
- `/packages/shared/src/types/blog.ts` (NEW)
- `/packages/shared/src/types/publish.ts` (MODIFIED - added 'website-blog')
- `/packages/db/src/repositories/blog.ts` (NEW)
- `/apps/admin/src/app/(dashboard)/dashboard/blog/page.tsx` (NEW)
- `/apps/admin/src/app/(dashboard)/dashboard/blog/[id]/page.tsx` (NEW)
- `/apps/admin/src/components/blog/BlogEditor.tsx` (NEW)
- `/apps/admin/src/components/blog/RichTextEditor.tsx` (NEW)
- `/apps/admin/src/components/publish/PublishComposer.tsx` (MODIFIED)
- `/apps/admin/src/app/api/publish/[id]/execute/route.ts` (MODIFIED)
- `/apps/admin/src/app/api/blog/route.ts` (NEW)
- `/apps/admin/src/app/api/blog/[id]/route.ts` (NEW)
- `/apps/web/src/app/[tenant]/blog/page.tsx` (NEW)
- `/apps/web/src/app/[tenant]/blog/[slug]/page.tsx` (NEW)
- `/apps/admin/src/components/website-design/BlogSettingsTab.tsx` (NEW)

### Dependencies Installed:
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-text-align slugify
pnpm add -D @types/slugify
```

### Estimated Time: 15 days (3 weeks)

---

## PRIORITY 2-4 OVERVIEW (To be detailed after Priority 1 approval)

**Priority 2: Custom Sections** (3 weeks)
- 7 section types with drag-drop reordering
- Section builder UI in admin
- Section rendering on storefront

**Priority 3: Live Preview** (1 week)
- Split-screen editor with iframe
- PostMessage communication
- Device preview modes

**Priority 4: Polish & Optimization** (1 week)
- Loading states and error handling
- Performance optimization
- Help tooltips and onboarding

---

**TOTAL ESTIMATED TIME: 8 weeks**
**READY FOR APPROVAL AND IMPLEMENTATION**
