'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { Video, Star, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MediaItem } from '@madebuy/shared'
import { useMediaLibrary } from './MediaLibraryClient'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'

interface UnlinkedMediaGridProps {
  media: MediaItem[]
}

// Virtualization threshold - only virtualize when we have many items
const VIRTUALIZATION_THRESHOLD = 30

// Grid configuration based on responsive breakpoints
// At xl: 6 cols, lg: 4 cols, md: 3 cols, sm: 2 cols
// We use a fixed column count for virtualization, responsive via CSS
const COLUMNS = 6

export function UnlinkedMediaGrid({ media }: UnlinkedMediaGridProps) {
  const { openLinkModal } = useMediaLibrary()
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const handleDelete = useCallback(async (e: React.MouseEvent, mediaId: string) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      return
    }

    setDeleting(mediaId)
    try {
      const response = await fetch(`/api/media/${mediaId}`, {
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
      setDeleting(null)
    }
  }, [router])

  // Group items into rows for virtualization
  const rows = useMemo(() => {
    const result: MediaItem[][] = []
    for (let i = 0; i < media.length; i += COLUMNS) {
      result.push(media.slice(i, i + COLUMNS))
    }
    return result
  }, [media])

  // Virtualizer for rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Estimated row height including gap
    overscan: 2,
  })

  if (media.length === 0) {
    return null
  }

  // For small lists, render without virtualization
  if (media.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {media.map((item) => (
          <MediaThumbnail
            key={item.id}
            item={item}
            deleting={deleting}
            onDelete={handleDelete}
            onLink={openLinkModal}
          />
        ))}
      </div>
    )
  }

  // Virtualized rendering for large lists
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ maxHeight: '60vh', contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 pb-4">
              {rows[virtualRow.index].map((item) => (
                <MediaThumbnail
                  key={item.id}
                  item={item}
                  deleting={deleting}
                  onDelete={handleDelete}
                  onLink={openLinkModal}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MediaThumbnailProps {
  item: MediaItem
  deleting: string | null
  onDelete: (e: React.MouseEvent, mediaId: string) => void
  onLink: (mediaId: string) => void
}

function MediaThumbnail({ item, deleting, onDelete, onLink }: MediaThumbnailProps) {
  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer transition-transform hover:scale-105"
      onClick={() => onLink(item.id)}
    >
      {item.type === 'image' ? (
        <img
          src={item.variants.thumb?.url || item.variants.original.url}
          alt={item.caption || 'Media'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-200">
          <Video className="h-12 w-12 text-gray-400" />
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => onDelete(e, item.id)}
        disabled={deleting === item.id}
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

      {/* Click to link indicator */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/10">
        <div className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full">
          Click to Link
        </div>
      </div>
    </div>
  )
}
