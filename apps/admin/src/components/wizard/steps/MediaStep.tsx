'use client'

import type { MediaItem } from '@madebuy/shared'
import { ArrowLeft, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useState } from 'react'

interface MediaStepProps {
  pieceId: string
  initialMediaIds: string[]
  primaryMediaId: string | null
  existingMedia: MediaItem[]
  onSave: (
    mediaIds: string[],
    primaryId: string | null,
    uploadedIds: string[],
  ) => void
  onBack: () => void
  onSkip: () => void
  loading: boolean
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  error?: string
}

export function MediaStep({
  pieceId,
  initialMediaIds,
  primaryMediaId,
  existingMedia,
  onSave,
  onBack,
  onSkip,
  loading,
}: MediaStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialMediaIds)
  const [primaryId, setPrimaryId] = useState<string | null>(primaryMediaId)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // All available media (existing + uploaded)
  const allMedia = existingMedia

  // Get media objects for selected IDs
  const selectedMedia = selectedIds
    .map((id) => allMedia.find((m) => m.id === id))
    .filter((m): m is MediaItem => !!m)

  const uploadFiles = async (files: File[]) => {
    const newUploading: UploadingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
    }))

    setUploadingFiles((prev) => [...prev, ...newUploading])

    for (const upload of newUploading) {
      try {
        const formData = new FormData()
        formData.append('file', upload.file)
        formData.append('pieceId', pieceId)

        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        const mediaId = data.media.id

        // Add to selected and mark as uploaded in this session
        setSelectedIds((prev) => [...prev, mediaId])
        setUploadedMediaIds((prev) => [...prev, mediaId])

        // Set as primary if first image
        if (selectedIds.length === 0 && uploadedMediaIds.length === 0) {
          setPrimaryId(mediaId)
        }

        // Update progress
        setUploadingFiles((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, progress: 100 } : u)),
        )

        // Remove from uploading after delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((u) => u.id !== upload.id))
        }, 500)
      } catch {
        setUploadingFiles((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, error: 'Upload failed' } : u,
          ),
        )
      }
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      // Check if this is a library item drag (not a file upload)
      const mediaId = e.dataTransfer.getData('application/x-media-id')
      if (mediaId) {
        // It's a library item - just select it
        if (!selectedIds.includes(mediaId)) {
          setSelectedIds((prev) => {
            const newIds = [...prev, mediaId]
            if (!primaryId) {
              setPrimaryId(mediaId)
            }
            return newIds
          })
        }
        return
      }

      // Otherwise, check for actual file drops
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )

      if (files.length > 0) {
        uploadFiles(files)
      }
    },
    [selectedIds, primaryId],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      uploadFiles(files)
    }
    // Reset input
    e.target.value = ''
  }

  const toggleMedia = (mediaId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(mediaId)) {
        // Removing
        const newIds = prev.filter((id) => id !== mediaId)
        // Update primary if we removed it
        if (primaryId === mediaId) {
          setPrimaryId(newIds[0] || null)
        }
        return newIds
      } else {
        // Adding
        const newIds = [...prev, mediaId]
        // Set as primary if first
        if (!primaryId) {
          setPrimaryId(mediaId)
        }
        return newIds
      }
    })
  }

  const setPrimary = (mediaId: string) => {
    if (selectedIds.includes(mediaId)) {
      setPrimaryId(mediaId)
    }
  }

  const removeUploading = (id: string) => {
    setUploadingFiles((prev) => prev.filter((u) => u.id !== id))
  }

  const handleSubmit = () => {
    onSave(selectedIds, primaryId, uploadedMediaIds)
  }

  const hasUploads = uploadingFiles.length > 0

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Show off your work</h2>
        <p className="mt-2 text-gray-600">
          Great photos help sell - add your best shots
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 text-base font-medium text-gray-900">
          Drop photos here or click to upload
        </p>
        <p className="mt-1 text-sm text-gray-500">PNG, JPG up to 10MB each</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((upload) => (
            <div
              key={upload.id}
              className={`flex items-center gap-3 rounded-lg p-3 ${
                upload.error ? 'bg-red-50' : 'bg-blue-50'
              }`}
            >
              <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center overflow-hidden">
                <img
                  src={URL.createObjectURL(upload.file)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.file.name}
                </p>
                {upload.error ? (
                  <p className="text-xs text-red-600">{upload.error}</p>
                ) : upload.progress < 100 ? (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-green-600">Uploaded!</p>
                )}
              </div>
              {upload.error && (
                <button
                  type="button"
                  onClick={() => removeUploading(upload.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected media preview */}
      {selectedMedia.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Selected ({selectedMedia.length})
            </p>
            <p className="text-xs text-gray-500">Click to set as main image</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {selectedMedia.map((media, _index) => (
              <div key={media.id} className="relative group">
                <button
                                    
                  onClick={() => setPrimary(media.id)}
                  className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-all ${
                    primaryId === media.id
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={
                      media.variants.thumb?.url || media.variants.original.url
                    }
                    alt=""
                    fill
                    className="object-cover"
                  />
                  {primaryId === media.id && (
                    <div className="absolute bottom-1 left-1 rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Main
                    </div>
                  )}
                </button>
                <button
                                    
                  onClick={() => toggleMedia(media.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing media library */}
      {allMedia.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Or select from your library
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3">
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {allMedia
                .filter((m) => !selectedIds.includes(m.id))
                .map((media) => (
                  <button
                    type="button"
                    key={media.id}
                    draggable
                    onClick={() => toggleMedia(media.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-media-id', media.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 hover:border-purple-400 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <Image
                      src={
                        media.variants.thumb?.url || media.variants.original.url
                      }
                      alt=""
                      fill
                      className="object-cover pointer-events-none"
                    />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {selectedMedia.length === 0 && allMedia.length === 0 && !hasUploads && (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No images yet. Upload some photos to showcase your item!
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
                    
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
                        
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
          <button
                        
            onClick={handleSubmit}
            disabled={loading || hasUploads}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Next: Where to Sell'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
