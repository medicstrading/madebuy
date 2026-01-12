'use client'

import { Play, Star, X } from 'lucide-react'
import type { MediaItem } from '@madebuy/shared'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { MediaPreviewModal } from './MediaPreviewModal'

interface PieceMediaThumbnailProps {
  item: MediaItem
}

export function PieceMediaThumbnail({ item }: PieceMediaThumbnailProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    setShowPreview(true)
  }

  return (
    <>
    <div
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {item.type === 'image' ? (
        <img
          src={item.variants.thumb?.url || item.variants.original.url}
          alt={item.caption || 'Media'}
          className="h-full w-full object-cover"
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
              {Math.floor(item.video.duration / 60)}:{String(Math.floor(item.video.duration % 60)).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Delete button - subtle, top right */}
      <button
        onClick={handleDelete}
        disabled={deleting}
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

    {/* Preview Modal */}
    {showPreview && (
      <MediaPreviewModal
        item={item}
        onClose={() => setShowPreview(false)}
      />
    )}
    </>
  )
}
