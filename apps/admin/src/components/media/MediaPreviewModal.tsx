'use client'

import type { MediaItem } from '@madebuy/shared'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

interface MediaPreviewModalProps {
  item: MediaItem
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function MediaPreviewModal({
  item,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: MediaPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev()
          break
        case 'ArrowRight':
          if (hasNext && onNext) onNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // Auto-play video with sound
  useEffect(() => {
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [item.type])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (e.target === e.currentTarget) {
            onClose()
          }
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Navigation arrows */}
      {hasPrev && onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {hasNext && onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Content */}
      <div
        className="max-w-6xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {item.type === 'image' ? (
          <img
            src={item.variants.large?.url || item.variants.original.url}
            alt={item.caption || item.originalFilename}
            className="max-w-full max-h-[90vh] mx-auto object-contain rounded-lg"
          />
        ) : (
          <video
            ref={videoRef}
            src={item.variants.original.url}
            poster={item.video?.thumbnailUrl}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] mx-auto rounded-lg"
          />
        )}

        {/* Caption */}
        {item.caption && (
          <p className="text-center text-white/80 mt-4 text-sm">
            {item.caption}
          </p>
        )}
      </div>
    </div>
  )
}
