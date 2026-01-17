'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MediaItem } from '@madebuy/shared'
import {
  AlertCircle,
  Check,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Play,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { memo, useCallback, useMemo, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface MediaGalleryProps {
  pieceId: string
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  onUpload: (files: File[]) => Promise<void>
  maxItems?: number
  maxVideoSize?: number // MB
  maxImageSize?: number // MB
}

interface SortableMediaItemProps {
  item: MediaItem
  isSelected: boolean
  onSelect: (id: string) => void
  onSetPrimary: (id: string) => void
  onDelete: (id: string) => void
  onPreview: (item: MediaItem) => void
}

// ============================================================================
// Sortable Media Item Component (Memoized to prevent re-renders during drag)
// ============================================================================

const SortableMediaItem = memo(function SortableMediaItem({
  item,
  isSelected,
  onSelect,
  onSetPrimary,
  onDelete,
  onPreview,
}: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const thumbnailUrl = useMemo(() => {
    if (item.type === 'video') {
      // Use video thumbnail if available, otherwise show placeholder
      return item.video?.thumbnailUrl || item.variants.thumb?.url || null
    }
    return item.variants.thumb?.url || item.variants.original?.url
  }, [item.type, item.video?.thumbnailUrl, item.variants])

  const isProcessing =
    item.processingStatus === 'pending' ||
    item.processingStatus === 'processing'
  const hasFailed = item.processingStatus === 'failed'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'z-50 shadow-xl' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 bg-white/90 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-gray-500" />
      </div>

      {/* Selection Checkbox */}
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={`absolute top-2 right-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-blue-500 border-blue-500'
            : 'bg-white/90 border-gray-300 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check className="h-4 w-4 text-white" />}
      </button>

      {/* Primary Badge */}
      {item.isPrimary && (
        <div className="absolute top-2 left-10 z-10 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
          Primary
        </div>
      )}

      {/* Thumbnail */}
      <div
        className="aspect-square bg-gray-100 cursor-pointer"
        onClick={() => onPreview(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPreview(item)
          }
        }}
        role="button"
        tabIndex={0}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.altText || item.originalFilename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.type === 'video' ? (
              <Video className="h-12 w-12 text-gray-400" />
            ) : (
              <ImageIcon className="h-12 w-12 text-gray-400" />
            )}
          </div>
        )}

        {/* Video Overlay */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="h-6 w-6 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        )}

        {/* Failed Overlay */}
        {hasFailed && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-1" />
              <span className="text-xs">Failed</span>
            </div>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSetPrimary(item.id)
              }}
              className={`p-1.5 rounded ${
                item.isPrimary
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/90 text-gray-600 hover:bg-amber-100'
              }`}
              title={item.isPrimary ? 'Primary image' : 'Set as primary'}
            >
              <Star className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPreview(item)
              }}
              className="p-1.5 bg-white/90 rounded text-gray-600 hover:bg-gray-100"
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
              className="p-1.5 bg-white/90 rounded text-red-600 hover:bg-red-100"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="p-2 bg-white border-t">
        <p
          className="text-xs text-gray-600 truncate"
          title={item.originalFilename}
        >
          {item.originalFilename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {item.type === 'video' ? (
            <Video className="h-3 w-3 text-purple-500" />
          ) : (
            <ImageIcon className="h-3 w-3 text-blue-500" />
          )}
          <span className="text-xs text-gray-400">
            {item.type === 'video' && item.video?.duration
              ? `${Math.floor(item.video.duration)}s`
              : item.sizeBytes
                ? `${(item.sizeBytes / 1024 / 1024).toFixed(1)}MB`
                : ''}
          </span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// Drag Overlay Component
// ============================================================================

function DragOverlayContent({ item }: { item: MediaItem }) {
  const thumbnailUrl = item.variants.thumb?.url || item.variants.original?.url

  return (
    <div className="w-40 rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500 bg-white">
      <div className="aspect-square bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.originalFilename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.type === 'video' ? (
              <Video className="h-8 w-8 text-gray-400" />
            ) : (
              <ImageIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Preview Modal Component
// ============================================================================

function PreviewModal({
  item,
  onClose,
}: {
  item: MediaItem | null
  onClose: () => void
}) {
  if (!item) return null

  const mediaUrl = item.variants.large?.url || item.variants.original?.url

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
      >
        <X className="h-8 w-8" />
      </button>

      <div
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg"
            poster={item.video?.thumbnailUrl}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt={item.altText || item.originalFilename}
            className="max-w-full max-h-[80vh] rounded-lg object-contain"
          />
        )}

        <div className="mt-4 text-center text-white">
          <p className="font-medium">{item.originalFilename}</p>
          {item.caption && (
            <p className="text-sm text-gray-300 mt-1">{item.caption}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main MediaGallery Component
// ============================================================================

export function MediaGallery({
  pieceId,
  media,
  onMediaChange,
  onUpload,
  maxItems = 20,
  maxVideoSize = 100,
  maxImageSize = 20,
}: MediaGalleryProps) {
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>(media)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showVideoOnly, setShowVideoOnly] = useState(false)

  // Video filter helpers
  const isVideo = useCallback(
    (m: MediaItem) => m.type === 'video' || m.mimeType?.startsWith('video/'),
    [],
  )
  const videoCount = useMemo(
    () => items.filter(isVideo).length,
    [items, isVideo],
  )
  const filteredItems = useMemo(
    () => (showVideoOnly ? items.filter(isVideo) : items),
    [items, showVideoOnly, isVideo],
  )

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Get active item for overlay
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId],
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)
        setItems(newItems)

        // Call API to persist reorder
        try {
          const response = await fetch(`/api/pieces/${pieceId}/media/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaIds: newItems.map((item) => item.id),
            }),
          })

          if (!response.ok) {
            // Revert on error
            setItems(items)
            console.error('Failed to reorder media')
          } else {
            // Update parent
            onMediaChange(newItems)
            router.refresh()
          }
        } catch (error) {
          setItems(items)
          console.error('Error reordering media:', error)
        }
      }
    },
    [items, pieceId, onMediaChange, router],
  )

  // Handle selection toggle
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // Handle set primary
  const handleSetPrimary = useCallback(
    async (id: string) => {
      // Move item to first position
      const itemIndex = items.findIndex((item) => item.id === id)
      if (itemIndex === -1) return

      const newItems = arrayMove(items, itemIndex, 0)
      setItems(newItems)

      try {
        const response = await fetch(`/api/pieces/${pieceId}/media/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaIds: newItems.map((item) => item.id),
          }),
        })

        if (!response.ok) {
          setItems(items)
          console.error('Failed to set primary media')
        } else {
          onMediaChange(newItems)
          router.refresh()
        }
      } catch (error) {
        setItems(items)
        console.error('Error setting primary media:', error)
      }
    },
    [items, pieceId, onMediaChange, router],
  )

  // Handle delete single item
  const handleDelete = useCallback(
    async (id: string) => {
      if (!deleteConfirmId) {
        setDeleteConfirmId(id)
        return
      }

      try {
        const response = await fetch(`/api/media/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          const newItems = items.filter((item) => item.id !== id)
          setItems(newItems)
          onMediaChange(newItems)
          router.refresh()
        }
      } catch (error) {
        console.error('Error deleting media:', error)
      } finally {
        setDeleteConfirmId(null)
      }
    },
    [items, deleteConfirmId, onMediaChange, router],
  )

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} item(s)?`,
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/media/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      })

      if (response.ok) {
        const newItems = items.filter((item) => !selectedIds.has(item.id))
        setItems(newItems)
        setSelectedIds(new Set())
        onMediaChange(newItems)
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting media:', error)
    }
  }, [items, selectedIds, onMediaChange, router])

  // Handle file drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type.startsWith('image/') || file.type.startsWith('video/'),
      )

      if (files.length === 0) return

      // Check limits
      if (items.length + files.length > maxItems) {
        alert(`Maximum ${maxItems} media items allowed`)
        return
      }

      // Validate sizes
      for (const file of files) {
        const maxSize = file.type.startsWith('video/')
          ? maxVideoSize * 1024 * 1024
          : maxImageSize * 1024 * 1024

        if (file.size > maxSize) {
          alert(
            `File "${file.name}" exceeds maximum size of ${
              file.type.startsWith('video/') ? maxVideoSize : maxImageSize
            }MB`,
          )
          return
        }
      }

      setUploading(true)
      try {
        await onUpload(files)
        router.refresh()
      } catch (error) {
        console.error('Upload error:', error)
      } finally {
        setUploading(false)
      }
    },
    [items.length, maxItems, maxVideoSize, maxImageSize, onUpload, router],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      {videoCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVideoOnly(!showVideoOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showVideoOnly
                ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Video
              className={`h-4 w-4 ${showVideoOnly ? 'animate-pulse' : ''}`}
            />
            Videos ({videoCount})
          </button>
          {showVideoOnly && (
            <span className="text-sm text-gray-500">
              Showing {filteredItems.length} of {items.length} items
            </span>
          )}
        </div>
      )}

      {/* Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedIds.size} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredItems.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${
              dragActive ? 'ring-2 ring-blue-400 ring-offset-2 rounded-lg' : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {filteredItems.map((item) => (
              <SortableMediaItem
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                onSetPrimary={handleSetPrimary}
                onDelete={handleDelete}
                onPreview={setPreviewItem}
              />
            ))}

            {/* Upload Drop Zone */}
            {items.length < maxItems && (
              <label
                className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files)
                      onUpload(files).then(() => router.refresh())
                    }
                  }}
                />
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                      Drop or click
                    </span>
                  </>
                )}
              </label>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && <DragOverlayContent item={activeItem} />}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {items.length === 0 && !uploading && (
        <div
          className={`p-12 text-center border-2 border-dashed rounded-lg ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No media yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop images or videos, or click to browse
          </p>
          <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  const files = Array.from(e.target.files)
                  onUpload(files).then(() => router.refresh())
                }
              }}
            />
            <Upload className="h-4 w-4" />
            Upload Media
          </label>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900">Delete Media?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone. The file will be permanently
              deleted.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  )
}

export default MediaGallery
