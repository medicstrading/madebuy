'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import type { DigitalFile } from '@madebuy/shared'

interface FileUploaderProps {
  pieceId: string
  onComplete: (file: DigitalFile) => void
  onClose: () => void
}

// Max file size: 250MB (reduced from 500MB for security)
const MAX_FILE_SIZE = 250 * 1024 * 1024

// Allowed extensions for display
const ALLOWED_EXTENSIONS = [
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.md',
  // Archives
  '.zip', '.rar', '.7z', '.gz', '.tar',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.tiff', '.bmp',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  // Video
  '.mp4', '.webm', '.mov', '.avi', '.mkv',
  // Design
  '.psd', '.eps', '.ai',
  // E-books
  '.epub', '.mobi',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2',
]

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'complete' | 'error'

export function FileUploader({ pieceId, onComplete, onClose }: FileUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setError(null)

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`)
      return
    }

    setSelectedFile(file)
    setDisplayName(file.name.replace(/\.[^/.]+$/, '')) // Remove extension
    setState('selected')
  }, [])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }, [handleFileSelect])

  // Upload file
  const uploadFile = useCallback(async () => {
    if (!selectedFile) return

    setState('uploading')
    setProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('name', displayName || selectedFile.name)
    if (description) formData.append('description', description)
    if (version) formData.append('version', version)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      await new Promise<DigitalFile>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setProgress(percent)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.file) {
                setState('complete')
                setTimeout(() => {
                  onComplete(response.file)
                }, 500)
                resolve(response.file)
              } else {
                reject(new Error('Invalid response'))
              }
            } catch {
              reject(new Error('Invalid response'))
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText)
              reject(new Error(response.error || `Upload failed (${xhr.status})`))
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`))
            }
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error'))
        }

        xhr.onabort = () => {
          reject(new Error('Upload cancelled'))
        }

        xhr.open('POST', `/api/pieces/${pieceId}/files`)
        xhr.send(formData)

        // Store xhr for cancellation
        abortControllerRef.current = { abort: () => xhr.abort() } as AbortController
      })
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [selectedFile, displayName, description, version, pieceId, onComplete])

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState('idle')
    setProgress(0)
    setSelectedFile(null)
    setDisplayName('')
    setDescription('')
    setVersion('')
  }, [])

  // Reset and try again
  const reset = useCallback(() => {
    setState('idle')
    setProgress(0)
    setSelectedFile(null)
    setDisplayName('')
    setDescription('')
    setVersion('')
    setError(null)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Digital File</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error State */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Idle State - Drop Zone */}
          {state === 'idle' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                onChange={handleChange}
                accept={ALLOWED_EXTENSIONS.join(',')}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />

              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                Drop your file here, or{' '}
                <span className="text-purple-600">browse</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                PDF, ZIP, images, audio, video up to {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          )}

          {/* Selected State - File Details */}
          {state === 'selected' && selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <FileText className="h-10 w-10 text-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Name shown to customers"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this file contains (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., v1.0 (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Uploading State */}
          {state === 'uploading' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-purple-200 border-t-purple-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Uploading...</p>
                  <p className="text-sm text-gray-500">
                    {selectedFile?.name} &bull; {progress}%
                  </p>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button
                onClick={cancelUpload}
                className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Upload
              </button>
            </div>
          )}

          {/* Complete State */}
          {state === 'complete' && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">Upload Complete!</p>
              <p className="mt-1 text-sm text-gray-500">
                Your file has been added to the product
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(state === 'idle' || state === 'selected' || state === 'error') && (
          <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={uploadFile}
              disabled={!selectedFile || !displayName.trim()}
              className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Upload File
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
