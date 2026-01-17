import { blog, media } from '@madebuy/db'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BlogEditor } from '@/components/blog/BlogEditor'
import { requireTenant } from '@/lib/session'

export default async function EditBlogPostPage({
  params,
}: {
  params: { id: string }
}) {
  const tenant = await requireTenant()

  // Get the blog post
  const post = await blog.getBlogPost(tenant.id, params.id)
  if (!post) {
    notFound()
  }

  // Get all media for cover image selection
  const allMedia = await media.listMedia(tenant.id, { type: 'image' })

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Blog Post</h1>
        <p className="mt-2 text-gray-600">
          Update your blog post content and settings
        </p>
      </div>

      <BlogEditor
        tenantId={tenant.id}
        availableMedia={allMedia}
        existingPost={post}
      />
    </div>
  )
}
