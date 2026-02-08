import { blog } from '@madebuy/db'
import { sanitizeInput } from '@madebuy/shared'
import { sanitizeHtml } from '@madebuy/shared/lib/sanitize'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/blog - List blog posts
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status') as
      | 'draft'
      | 'published'
      | undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    const posts = await blog.listBlogPosts(tenant.id, {
      status,
      tags,
      limit,
      offset,
    })

    return NextResponse.json(posts)
  } catch (error: any) {
    console.error('Error listing blog posts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/blog - Create blog post
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.title || !data.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 },
      )
    }

    const post = await blog.createBlogPost(tenant.id, {
      title: sanitizeInput(data.title),
      content: sanitizeHtml(data.content),
      excerpt: data.excerpt ? sanitizeInput(data.excerpt) : undefined,
      coverImageId: data.coverImageId,
      tags: data.tags || [],
      metaTitle: data.metaTitle ? sanitizeInput(data.metaTitle) : undefined,
      metaDescription: data.metaDescription
        ? sanitizeInput(data.metaDescription)
        : undefined,
      status: data.status || 'draft',
      publishRecordId: data.publishRecordId,
    })

    return NextResponse.json(post)
  } catch (error: any) {
    console.error('Error creating blog post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
