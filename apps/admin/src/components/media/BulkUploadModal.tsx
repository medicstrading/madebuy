'use client'

import type { Piece } from '@madebuy/shared'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  Upload,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface UploadFile {
  file: File
  id: string
  previewUrl: string
  fileName: string
  fileSize: string
  isVideo: boolean
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  pieceId?: string
  pieceName?: string
}

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  pieces: Piece[]
}

// Move formatFileSize outside component - it's a pure function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

export function BulkUploadModal({
  isOpen,
  onClose,
  pieces,
}: BulkUploadModalProps) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      isVideo: file.type.startsWith('video/'),
      status: 'pending' as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB max
    multiple: true,
  })

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    }
  }, [files])

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Assign piece to file
  const handleFileAssign = (fileId: string, pieceId: string) => {
    if (pieceId === '__unassigned__') {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, pieceId: undefined, pieceName: undefined }
            : f,
        ),
      )
    } else {
      const piece = pieces.find((p) => p.id === pieceId)
      if (piece) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, pieceId: piece.id, pieceName: piece.name }
              : f,
          ),
        )
      }
    }
  }

  // Bulk assign selected files to a piece
  const handleBulkAssign = (pieceId: string) => {
    if (pieceId === '__unassigned__') {
      setFiles((prev) =>
        prev.map((f) =>
          selectedFileIds.includes(f.id)
            ? { ...f, pieceId: undefined, pieceName: undefined }
            : f,
        ),
      )
    } else {
      const piece = pieces.find((p) => p.id === pieceId)
      if (piece) {
        setFiles((prev) =>
          prev.map((f) =>
            selectedFileIds.includes(f.id)
              ? { ...f, pieceId: piece.id, pieceName: piece.name }
              : f,
          ),
        )
      }
    }
    setSelectedFileIds([])
  }

  const updateFileStatus = useCallback(
    (
      fileId: string,
      status: UploadFile['status'],
      progress: number,
      error?: string,
    ) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status, progress, error } : f,
        ),
      )
    },
    [],
  )

  // Upload all files - defined with useCallback BEFORE the useEffect that uses it
  const handleUploadAll = useCallback(async () => {
    setIsUploading(true)
    setSuccessCount(0)
    setErrorCount(0)

    // Get files that need uploading
    const filesToUpload = files.filter((f) => f.status !== 'success')
    const queue = [...filesToUpload]
    const concurrent = 3
    let localSuccessCount = 0
    let localErrorCount = 0

    const uploadNext = async () => {
      while (queue.length > 0) {
        const file = queue.shift()
        if (!file) break

        try {
          updateFileStatus(file.id, 'uploading', 0)

          const formData = new FormData()
          formData.append('file', file.file)
          if (file.pieceId) {
            formData.append('pieceId', file.pieceId)
          }

          const response = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}))
            throw new Error(errorBody.error || 'Upload failed')
          }

          updateFileStatus(file.id, 'success', 100)
          localSuccessCount++
          setSuccessCount(localSuccessCount)
        } catch (error: any) {
          updateFileStatus(file.id, 'error', 0, error.message)
          localErrorCount++
          setErrorCount(localErrorCount)
        }
      }
    }

    await Promise.all(Array.from({ length: concurrent }, () => uploadNext()))

    setIsUploading(false)
  }, [files, updateFileStatus])

  const handleClose = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    setFiles([])
    setSelectedFileIds([])
    setSuccessCount(0)
    setErrorCount(0)
    router.refresh()
    onClose()
  }, [files, router, onClose])

  // Keyboard shortcuts - AFTER handleUploadAll and handleClose are defined
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        handleClose()
      }
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        setSelectedFileIds(files.map((f) => f.id))
      }
      if (e.key === 'Enter' && !isUploading && files.length > 0) {
        handleUploadAll()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isUploading, files, handleUploadAll, handleClose])

  // Auto-close on success
  useEffect(() => {
    const allFilesSuccess =
      files.length > 0 && files.every((f) => f.status === 'success')
    if (allFilesSuccess && !isUploading) {
      const timer = setTimeout(() => handleClose(), 1500)
      return () => clearTimeout(timer)
    }
  }, [files, isUploading, handleClose])

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    )
  }

  const removeFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) URL.revokeObjectURL(file.previewUrl)
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setSelectedFileIds((prev) => prev.filter((id) => id !== fileId))
  }

  if (!isOpen) return null

  const unassignedCount = files.filter((f) => !f.pieceId).length
  const allFilesSuccess =
    files.length > 0 && files.every((f) => f.status === 'success')

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={!isUploading ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 bg-white rounded-xl flex flex-col max-h-screen shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload</h2>
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {successCount} of {files.length} uploaded
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop Zone */}
          {files.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-1">
                    Drop images or videos here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    JPG, PNG, WebP, GIF up to 10MB &bull; MP4, MOV, WebM up to
                    100MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={open}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
            >
              <Plus className="w-4 h-4" />
              Add more files
            </button>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              {/* Bulk Actions Bar */}
              {selectedFileIds.length > 0 && (
                <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedFileIds.length} file
                      {selectedFileIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFileIds([])}
                        className="text-sm text-blue-700 hover:text-blue-800"
                      >
                        Clear
                      </button>
                      <select
                        onChange={(e) => handleBulkAssign(e.target.value)}
                        defaultValue=""
                        className="text-sm px-3 py-1.5 border border-blue-300 rounded-lg bg-white"
                      >
                        <option value="" disabled>
                          Assign to...
                        </option>
                        <option value="__unassigned__">Unlinked</option>
                        {pieces.map((piece) => (
                          <option key={piece.id} value={piece.id}>
                            {piece.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Files */}
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedFileIds.includes(file.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <label className="flex items-center cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                      </label>

                      {/* Preview */}
                      <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {file.isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <video
                              src={file.previewUrl}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-8 h-8 text-white/70" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={file.previewUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.fileSize}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            disabled={isUploading}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 mb-2">
                          {file.status === 'uploading' && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                          {file.status === 'pending' && (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                          {file.status === 'success' && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {file.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-600">
                            {file.status === 'pending' && 'Ready'}
                            {file.status === 'uploading' && 'Uploading...'}
                            {file.status === 'success' && 'Done'}
                            {file.status === 'error' && file.error}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {(file.status === 'uploading' ||
                          file.status === 'success') && (
                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all ${
                                file.status === 'success'
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}

                        {/* Assignment Dropdown */}
                        {file.status !== 'success' && (
                          <select
                            value={file.pieceId || '__unassigned__'}
                            onChange={(e) =>
                              handleFileAssign(file.id, e.target.value)
                            }
                            disabled={isUploading}
                            className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
                          >
                            <option value="__unassigned__">
                              Unlinked (organize later)
                            </option>
                            {pieces.map((piece) => (
                              <option key={piece.id} value={piece.id}>
                                {piece.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {files.length} file{files.length !== 1 ? 's' : ''}
              {unassignedCount > 0 && (
                <span className="text-amber-600 ml-2">
                  ({unassignedCount} unlinked)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isUploading || files.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload All (${files.length})`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {allFilesSuccess && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5" />
            All {files.length} files uploaded!
          </div>
        )}
      </div>
    </div>
  )
}
