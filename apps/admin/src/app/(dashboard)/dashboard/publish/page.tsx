import { requireTenant } from '@/lib/session'
import { publish } from '@madebuy/db'
import { formatDate } from '@/lib/utils'
import { Plus, Instagram, Facebook, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function PublishPage() {
  const tenant = await requireTenant()
  const allPublishRecords = await publish.listPublishRecords(tenant.id)

  const stats = {
    total: allPublishRecords.length,
    published: allPublishRecords.filter(p => p.status === 'published').length,
    scheduled: allPublishRecords.filter(p => p.status === 'scheduled').length,
    draft: allPublishRecords.filter(p => p.status === 'draft').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Publishing</h1>
          <p className="mt-2 text-gray-600">Manage your social media posts</p>
        </div>
        <Link
          href="/dashboard/publish/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Post
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total Posts" value={stats.total} icon={TrendingUp} color="blue" />
        <StatCard title="Published" value={stats.published} icon={Instagram} color="green" />
        <StatCard title="Scheduled" value={stats.scheduled} icon={Calendar} color="purple" />
        <StatCard title="Drafts" value={stats.draft} icon={Facebook} color="gray" />
      </div>

      {!tenant.socialConnections || tenant.socialConnections.length === 0 ? (
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Connect Your Social Accounts
          </h3>
          <p className="text-blue-800 mb-4">
            Connect your Instagram, Facebook, or other social media accounts to start publishing.
          </p>
          <Link
            href="/dashboard/connections"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Connect Accounts
          </Link>
        </div>
      ) : null}

      {allPublishRecords.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Share2Icon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No posts yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Create your first social media post to share your work.
          </p>
          <Link
            href="/dashboard/publish/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Link>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Caption
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scheduled For
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allPublishRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2 max-w-md">
                      {record.caption}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {record.mediaIds.length} media • {record.hashtags.length} hashtags
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex gap-1">
                      {record.platforms.map(platform => (
                        <PlatformIcon key={platform} platform={platform} />
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <PublishStatusBadge status={record.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.scheduledFor ? formatDate(record.scheduledFor) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(record.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: number
  icon: any
  color: 'blue' | 'green' | 'purple' | 'gray'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function PublishStatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    publishing: 'bg-purple-100 text-purple-800',
    published: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.draft}`}>
      {status}
    </span>
  )
}

function PlatformIcon({ platform }: { platform: string }) {
  const colors = {
    instagram: 'bg-pink-100 text-pink-600',
    facebook: 'bg-blue-100 text-blue-600',
    tiktok: 'bg-gray-900 text-white',
    pinterest: 'bg-red-100 text-red-600',
    youtube: 'bg-red-100 text-red-600',
  }

  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${colors[platform as keyof typeof colors]}`}>
      {platform[0].toUpperCase()}
    </span>
  )
}

function Share2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}
