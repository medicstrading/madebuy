'use client'

import { Video, Star, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MediaItem } from '@madebuy/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PieceMediaThumbnailProps {
  item: MediaItem
}

export function PieceMediaThumbnail({ item }: PieceMediaThumbnailProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete media')
      }

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete media. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
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

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50 z-10"
        title="Delete media"
      >
        <X className="h-4 w-4" />
      </button>

      {item.isFavorite && (
        <div className="absolute top-2 left-2">
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
  )
}
