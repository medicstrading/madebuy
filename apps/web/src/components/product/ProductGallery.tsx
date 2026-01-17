'use client'

import type { MediaItem } from '@madebuy/shared'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface ProductGalleryProps {
  media: MediaItem[]
  productName: string
  className?: string
}

interface LightboxProps {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  productName: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMediaUrl(
  item: MediaItem,
  size: 'thumb' | 'large' | 'original' = 'large',
): string {
  return item.variants[size]?.url || item.variants.original?.url || ''
}

function getThumbnailUrl(item: MediaItem): string {
  if (item.type === 'video') {
    return item.video?.thumbnailUrl || item.variants.thumb?.url || ''
  }
  return item.variants.thumb?.url || item.variants.original?.url || ''
}

// ============================================================================
// Lightbox Component
// ============================================================================

function Lightbox({
  media,
  currentIndex,
  onClose,
  onNavigate,
  productName,
}: LightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentItem = media[currentIndex]
  const isVideo = currentItem?.type === 'video'

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (currentIndex > 0) onNavigate(currentIndex - 1)
          break
        case 'ArrowRight':
          if (currentIndex < media.length - 1) onNavigate(currentIndex + 1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [currentIndex, media.length, onClose, onNavigate])

  // Handle zoom mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isZoomed || isVideo) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setZoomPosition({ x, y })
    },
    [isZoomed, isVideo],
  )

  // Toggle video play/pause
  const toggleVideoPlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsVideoPlaying(true)
    } else {
      video.pause()
      setIsVideoPlaying(false)
    }
  }, [])

  // Toggle video mute
  const toggleVideoMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsVideoMuted(video.muted)
  }, [])

  if (!currentItem) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {currentIndex < media.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex + 1)
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Main Content */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        role="presentation"
      >
        {isVideo ? (
          <div className="relative max-w-4xl w-full">
            <video
              ref={videoRef}
              src={getMediaUrl(currentItem, 'original')}
              poster={currentItem.video?.thumbnailUrl}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              onClick={toggleVideoPlay}
            />

            {/* Video Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-white">
              <button
                onClick={toggleVideoPlay}
                className="p-2 bg-black/50 rounded-full hover:bg-black/70"
              >
                {isVideoPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={toggleVideoMute}
                className="p-2 bg-black/50 rounded-full hover:bg-black/70"
              >
                {isVideoMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative max-w-4xl max-h-[85vh] ${
              isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            <img
              src={getMediaUrl(currentItem, 'original')}
              alt={currentItem.altText || productName}
              className={`max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-200 ${
                isZoomed ? 'scale-150' : ''
              }`}
              style={
                isZoomed
                  ? {
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
          {media.map((item, index) => (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(index)
              }}
              className={`relative w-16 h-16 rounded overflow-hidden transition-all ${
                index === currentIndex
                  ? 'ring-2 ring-white'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getThumbnailUrl(item)}
                alt=""
                className="w-full h-full object-cover"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      <div className="absolute bottom-4 right-4 text-white/80 text-sm">
        {currentIndex + 1} / {media.length}
      </div>

      {/* Zoom Toggle (for images) */}
      {!isVideo && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsZoomed(!isZoomed)
          }}
          className="absolute bottom-4 left-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
        >
          {isZoomed ? (
            <ZoomOut className="h-5 w-5" />
          ) : (
            <ZoomIn className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main ProductGallery Component
// ============================================================================

export function ProductGallery({
  media,
  productName,
  className = '',
}: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  const [isVideoHovered, setIsVideoHovered] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const mainVideoRef = useRef<HTMLVideoElement>(null)

  // Sort media by displayOrder
  const sortedMedia = useMemo(
    () =>
      [...media].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [media],
  )

  const currentItem = sortedMedia[currentIndex]
  const isCurrentVideo = currentItem?.type === 'video'

  // Swipe detection
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < sortedMedia.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Video hover autoplay
  const handleVideoMouseEnter = useCallback(() => {
    setIsVideoHovered(true)
    if (mainVideoRef.current) {
      mainVideoRef.current.muted = true
      mainVideoRef.current.play().catch(() => {})
    }
  }, [])

  const handleVideoMouseLeave = useCallback(() => {
    setIsVideoHovered(false)
    if (mainVideoRef.current) {
      mainVideoRef.current.pause()
      mainVideoRef.current.currentTime = 0
    }
  }, [])

  // Preload adjacent images
  useEffect(() => {
    const preloadIndexes = [currentIndex - 1, currentIndex + 1].filter(
      (i) => i >= 0 && i < sortedMedia.length,
    )

    preloadIndexes.forEach((index) => {
      const item = sortedMedia[index]
      if (item && item.type === 'image') {
        const img = new Image()
        img.src = getMediaUrl(item, 'large')
      }
    })
  }, [currentIndex, sortedMedia])

  if (sortedMedia.length === 0) {
    return (
      <div
        className={`aspect-square bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <span className="text-gray-400">No images</span>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Main Image/Video */}
      <div
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
        onClick={() => setShowLightbox(true)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={isCurrentVideo ? handleVideoMouseEnter : undefined}
        onMouseLeave={isCurrentVideo ? handleVideoMouseLeave : undefined}
      >
        {isCurrentVideo ? (
          <>
            {/* Video Poster/Thumbnail */}
            {!isVideoHovered && (
              <img
                src={
                  currentItem.video?.thumbnailUrl ||
                  getThumbnailUrl(currentItem)
                }
                alt={productName}
                className="w-full h-full object-cover"
              />
            )}

            {/* Video Element (shows on hover) */}
            <video
              ref={mainVideoRef}
              src={getMediaUrl(currentItem, 'original')}
              poster={currentItem.video?.thumbnailUrl}
              muted
              playsInline
              loop
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                isVideoHovered ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-16 h-16 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${
                  isVideoHovered ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={getMediaUrl(currentItem, 'large')}
            alt={currentItem.altText || productName}
            className="w-full h-full object-cover"
            loading="eager"
          />
        )}

        {/* Zoom Hint */}
        <div className="absolute top-3 right-3 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="h-4 w-4 text-gray-600" />
        </div>

        {/* Navigation Arrows (Desktop) */}
        {sortedMedia.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(currentIndex - 1)
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 text-gray-800" />
              </button>
            )}

            {currentIndex < sortedMedia.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(currentIndex + 1)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 text-gray-800" />
              </button>
            )}
          </>
        )}

        {/* Dots Indicator (Mobile) */}
        {sortedMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
            {sortedMedia.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {sortedMedia.length > 1 && (
        <div className="hidden sm:flex gap-2 mt-3 overflow-x-auto pb-1">
          {sortedMedia.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                index === currentIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={getThumbnailUrl(item)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="h-5 w-5 text-white drop-shadow" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <Lightbox
          media={sortedMedia}
          currentIndex={currentIndex}
          onClose={() => setShowLightbox(false)}
          onNavigate={setCurrentIndex}
          productName={productName}
        />
      )}
    </div>
  )
}

export default ProductGallery
