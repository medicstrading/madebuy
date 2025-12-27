import { requireTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { BlogEditor } from '@/components/blog/BlogEditor'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewBlogPostPage() {
  const tenant = await requireTenant()

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
        <h1 className="text-3xl font-bold text-gray-900">New Blog Post</h1>
        <p className="mt-2 text-gray-600">Create a new blog post for your website</p>
      </div>

      <BlogEditor
        tenantId={tenant.id}
        availableMedia={allMedia}
      />
    </div>
  )
}
