import { blog } from '@madebuy/db'
import { sanitizeHtml } from '@madebuy/shared/lib/sanitize'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/blog/[id] - Get blog post by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await blog.getBlogPost(tenant.id, params.id)

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(post)
  } catch (error: any) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/blog/[id] - Update blog post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const post = await blog.updateBlogPost(tenant.id, params.id, {
      title: data.title,
      slug: data.slug,
      content: data.content ? sanitizeHtml(data.content) : undefined,
      excerpt: data.excerpt,
      coverImageId: data.coverImageId,
      tags: data.tags,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      status: data.status,
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(post)
  } catch (error: any) {
    console.error('Error updating blog post:', error)

    // Handle slug uniqueness error
    if (error.message.includes('Slug already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/blog/[id] - Delete blog post
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if blog post exists
    const post = await blog.getBlogPost(tenant.id, params.id)
    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 },
      )
    }

    await blog.deleteBlogPost(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
