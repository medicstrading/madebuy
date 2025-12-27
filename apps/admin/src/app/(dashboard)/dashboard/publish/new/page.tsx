import { requireTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { PublishComposer } from '@/components/publish/PublishComposer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { SocialPlatform } from '@madebuy/shared'

export default async function NewPublishPage() {
  const tenant = await requireTenant()

  // Get all media for this tenant
  const allMedia = await media.listMedia(tenant.id, { type: 'image' })

  // Get connected platforms
  const connectedPlatforms: SocialPlatform[] = tenant.socialConnections
    ?.filter(conn => conn.isActive)
    .map(conn => conn.platform) || []

  // Add website-blog if enabled
  if (tenant.websiteDesign?.blog?.enabled) {
    connectedPlatforms.push('website-blog')
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/publish"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create Social Post</h1>
        <p className="mt-2 text-gray-600">Share your work across social media platforms</p>
      </div>

      {connectedPlatforms.length === 0 ? (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            No Social Accounts Connected
          </h3>
          <p className="text-yellow-800 mb-4">
            You need to connect at least one social media account before you can publish.
          </p>
          <Link
            href="/dashboard/connections/social"
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            Connect Accounts
          </Link>
        </div>
      ) : (
        <PublishComposer
          tenantId={tenant.id}
          connectedPlatforms={connectedPlatforms}
          availableMedia={allMedia}
        />
      )}
    </div>
  )
}
