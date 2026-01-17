'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'

interface FileInfo {
  id: string
  name: string
  fileName: string
  description?: string
  version?: string
  sizeBytes: number
  mimeType: string
  downloadCount: number
}

interface DownloadData {
  status: 'valid' | 'expired' | 'revoked' | 'limit_reached'
  statusMessage?: string
  isValid: boolean

  product: {
    id: string
    name: string
    description?: string
  }

  seller: {
    name: string
    slug: string
  } | null

  files: FileInfo[]
  fileCount: number
  totalSizeBytes: number

  downloadCount: number
  maxDownloads?: number | null
  downloadsRemaining: number | null

  expiresAt: string | null
  hasExpiry: boolean

  license: {
    type: 'personal' | 'commercial' | 'extended'
    text?: string
  } | null

  customer: {
    name: string
  }

  orderId: string
  token: string
}

interface DownloadPageClientProps {
  data: DownloadData
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

// Get icon for file type
function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('pdf')) return '📄'
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  )
    return '📦'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return '📊'
  if (mimeType.includes('font')) return '🔤'
  return '📁'
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// License labels
const LICENSE_LABELS = {
  personal: 'Personal Use License',
  commercial: 'Commercial License',
  extended: 'Extended License',
}

export function DownloadPageClient({ data }: DownloadPageClientProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [licenseAccepted, setLicenseAccepted] = useState(!data.license)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Handle file download
  const downloadFile = useCallback(
    async (fileId: string) => {
      if (!data.isValid) return
      if (!licenseAccepted) {
        setDownloadError('Please accept the license terms before downloading.')
        return
      }

      setDownloading(fileId)
      setDownloadError(null)

      try {
        // Trigger download by navigating to download URL
        const downloadUrl = `/api/downloads/${data.token}?file=${fileId}`
        window.location.href = downloadUrl
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : 'Download failed')
      } finally {
        // Reset after a delay (for redirect to complete)
        setTimeout(() => setDownloading(null), 2000)
      }
    },
    [data.token, data.isValid, licenseAccepted],
  )

  // Status color classes
  const statusColors = {
    valid: 'bg-green-50 text-green-700 border-green-200',
    expired: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    revoked: 'bg-red-50 text-red-700 border-red-200',
    limit_reached: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  const StatusIcon = data.isValid ? CheckCircle : AlertCircle

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Download className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your Download</h1>
          <p className="mt-2 text-gray-600">
            Hi {data.customer.name}, your files are ready
          </p>
        </div>

        {/* Status Banner */}
        <div
          className={`mb-6 rounded-lg border p-4 ${statusColors[data.status]}`}
        >
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {data.isValid
                  ? 'Downloads Available'
                  : data.status === 'expired'
                    ? 'Link Expired'
                    : data.status === 'revoked'
                      ? 'Access Revoked'
                      : 'Download Limit Reached'}
              </p>
              {data.statusMessage && (
                <p className="text-sm opacity-80">{data.statusMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Product Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {data.product.name}
              </h2>
              {data.product.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {data.product.description}
                </p>
              )}
              {data.seller && (
                <p className="mt-2 text-sm text-gray-500">
                  From{' '}
                  <Link
                    href={`/${data.seller.slug}`}
                    className="font-medium text-purple-600 hover:text-purple-700"
                  >
                    {data.seller.name}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Download Stats */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <FileText className="h-4 w-4" />
              {data.fileCount} file{data.fileCount !== 1 ? 's' : ''} &bull;{' '}
              {formatFileSize(data.totalSizeBytes)}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Download className="h-4 w-4" />
              {data.downloadCount} download{data.downloadCount !== 1 ? 's' : ''}
              {data.maxDownloads && <> / {data.maxDownloads} allowed</>}
            </div>
            {data.hasExpiry && data.expiresAt && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-4 w-4" />
                Expires {formatDate(data.expiresAt)}
              </div>
            )}
          </div>
        </div>

        {/* License Agreement */}
        {data.license && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">License Agreement</h3>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 mb-4">
              <p className="font-medium text-gray-900">
                {LICENSE_LABELS[data.license.type]}
              </p>
              {data.license.text && (
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {data.license.text}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={licenseAccepted}
                onChange={(e) => {
                  setLicenseAccepted(e.target.checked)
                  setDownloadError(null)
                }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the license terms
              </span>
            </label>
          </div>
        )}

        {/* Error Message */}
        {downloadError && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{downloadError}</p>
          </div>
        )}

        {/* Files List */}
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="font-semibold text-gray-900">Your Files</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {data.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50"
              >
                <span className="text-2xl">
                  {getFileTypeIcon(file.mimeType)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {file.fileName} &bull; {formatFileSize(file.sizeBytes)}
                    {file.version && <> &bull; {file.version}</>}
                  </p>
                  {file.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {file.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => downloadFile(file.id)}
                  disabled={!data.isValid || downloading === file.id}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    data.isValid
                      ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-400'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {downloading === file.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Remaining Downloads */}
          {data.isValid && data.downloadsRemaining !== null && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                {data.downloadsRemaining} download
                {data.downloadsRemaining !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Having trouble?{' '}
            {data.seller && (
              <Link
                href={`/${data.seller.slug}/contact`}
                className="font-medium text-purple-600 hover:text-purple-700"
              >
                Contact {data.seller.name}
                <ArrowRight className="ml-1 inline h-3 w-3" />
              </Link>
            )}
          </p>
        </div>

        {/* Order Reference */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Order: {data.orderId}</p>
        </div>
      </div>
    </div>
  )
}
