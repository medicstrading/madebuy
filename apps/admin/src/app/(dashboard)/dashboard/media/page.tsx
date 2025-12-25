import { requireTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { formatDate } from '@/lib/utils'
import { Plus, Image as ImageIcon, Video, Star } from 'lucide-react'
import Link from 'next/link'

export default async function MediaPage() {
  const tenant = await requireTenant()
  const allMedia = await media.listMedia(tenant.id)

  const stats = {
    total: allMedia.length,
    images: allMedia.filter(m => m.type === 'image').length,
    videos: allMedia.filter(m => m.type === 'video').length,
    favorites: allMedia.filter(m => m.isFavorite).length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="mt-2 text-gray-600">Manage your photos and videos</p>
        </div>
        <Link
          href="/dashboard/media/upload"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Upload Media
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total Files" value={stats.total} icon={ImageIcon} color="blue" />
        <StatCard title="Images" value={stats.images} icon={ImageIcon} color="green" />
        <StatCard title="Videos" value={stats.videos} icon={Video} color="purple" />
        <StatCard title="Favorites" value={stats.favorites} icon={Star} color="yellow" />
      </div>

      {allMedia.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No media yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Upload photos and videos to showcase your work.
          </p>
          <Link
            href="/dashboard/media/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Upload Media
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {allMedia.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              {item.type === 'image' ? (
                <img
                  src={item.variants.thumb?.url || item.variants.original.url}
                  alt={item.caption || 'Media'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {item.isFavorite && (
                <div className="absolute top-2 right-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs text-white line-clamp-2">
                    {item.caption || item.originalFilename}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
  color: 'blue' | 'green' | 'purple' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
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
