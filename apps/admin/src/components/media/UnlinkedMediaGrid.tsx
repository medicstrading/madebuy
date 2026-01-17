'use client'

import type { MediaItem } from '@madebuy/shared'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link2, Play, Star, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useMediaLibrary } from './MediaLibraryClient'
import { MediaPreviewModal } from './MediaPreviewModal'

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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const handleDelete = useCallback(
    async (e: React.MouseEvent, mediaId: string) => {
      e.stopPropagation()

      if (
        !confirm(
          'Are you sure you want to delete this media? This action cannot be undone.',
        )
      ) {
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
    },
    [router],
  )

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

  const handlePreview = useCallback((index: number) => {
    setPreviewIndex(index)
  }, [])

  const previewItem = previewIndex !== null ? media[previewIndex] : null

  // For small lists, render without virtualization
  if (media.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {media.map((item, index) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              deleting={deleting}
              onDelete={handleDelete}
              onLink={openLinkModal}
              onPreview={() => handlePreview(index)}
            />
          ))}
        </div>

        {/* Preview Modal */}
        {previewItem && previewIndex !== null && (
          <MediaPreviewModal
            item={previewItem}
            onClose={() => setPreviewIndex(null)}
            onPrev={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
            onNext={() =>
              setPreviewIndex(Math.min(media.length - 1, previewIndex + 1))
            }
            hasPrev={previewIndex > 0}
            hasNext={previewIndex < media.length - 1}
          />
        )}
      </>
    )
  }

  // Virtualized rendering for large lists
  const virtualItems = virtualizer.getVirtualItems()

  // Calculate flat index for virtualized items
  const getItemIndex = (rowIndex: number, colIndex: number) =>
    rowIndex * COLUMNS + colIndex

  return (
    <>
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
                {rows[virtualRow.index].map((item, colIndex) => (
                  <MediaThumbnail
                    key={item.id}
                    item={item}
                    deleting={deleting}
                    onDelete={handleDelete}
                    onLink={openLinkModal}
                    onPreview={() =>
                      handlePreview(getItemIndex(virtualRow.index, colIndex))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && previewIndex !== null && (
        <MediaPreviewModal
          item={previewItem}
          onClose={() => setPreviewIndex(null)}
          onPrev={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
          onNext={() =>
            setPreviewIndex(Math.min(media.length - 1, previewIndex + 1))
          }
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < media.length - 1}
        />
      )}
    </>
  )
}

interface MediaThumbnailProps {
  item: MediaItem
  deleting: string | null
  onDelete: (e: React.MouseEvent, mediaId: string) => void
  onLink: (mediaId: string) => void
  onPreview: () => void
}

function MediaThumbnail({
  item,
  deleting,
  onDelete,
  onLink,
  onPreview,
}: MediaThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const handleClick = () => {
    // Stop video preview before opening modal
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.pause()
    }
    onPreview()
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLink(item.id)
  }

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.type === 'image' ? (
        <img
          src={item.variants.thumb?.url || item.variants.original.url}
          alt={item.caption || 'Media'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="relative h-full w-full bg-gray-900">
          <video
            ref={videoRef}
            src={item.variants.original.url}
            poster={item.video?.thumbnailUrl}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
          />
          {/* Play icon - only when not hovering */}
          {!isHovered && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Play className="h-8 w-8 text-white/70 drop-shadow-lg" />
            </div>
          )}
          {/* Duration badge */}
          {item.video?.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
              {Math.floor(item.video.duration / 60)}:
              {String(Math.floor(item.video.duration % 60)).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Link button - bottom right, only on hover */}
      <button
        type="button"
        onClick={handleLinkClick}
        className="absolute bottom-1.5 left-1.5 p-1.5 bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700 z-10"
        title="Link to piece"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>

      {/* Delete button - top right, only on hover */}
      <button
        type="button"
        onClick={(e) => onDelete(e, item.id)}
        disabled={deleting === item.id}
        className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 z-10"
        title="Delete"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Favorite star */}
      {item.isFavorite && (
        <div className="absolute top-1.5 left-1.5">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow" />
        </div>
      )}
    </div>
  )
}
