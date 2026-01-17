'use client'

import { ArrowLeft, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

export default function InvoiceScanPage() {
  const router = useRouter()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [_invoiceId, setInvoiceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      showError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      showError('Only PDF, JPG, and PNG files are allowed')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else if (selectedFile.type === 'application/pdf') {
      setPreview(null) // PDFs will show generic icon
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/materials/invoice-scan/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setInvoiceId(uploadData.invoiceId)
      success('Invoice uploaded successfully')

      // Start OCR processing
      setUploading(false)
      setProcessing(true)

      const processRes = await fetch('/api/materials/invoice-scan/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: uploadData.invoiceId }),
      })

      if (!processRes.ok) {
        const errorData = await processRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'OCR processing failed')
      }

      const processData = await processRes.json()
      success(`Extracted ${processData.lineItemCount || 0} line items`)

      // Navigate to review page with extracted data
      setTimeout(() => {
        router.push(
          `/dashboard/materials/invoice-scan/review?invoiceId=${processData.invoiceId}`,
        )
      }, 500)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      showError(errorMessage)
      setUploading(false)
      setProcessing(false)
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/materials"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Materials
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Scan Supplier Invoice
          </h1>
          <p className="text-gray-600 mb-6">
            Upload an invoice (PDF or image) to automatically extract material
            information
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Drop invoice here or click to upload
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Supports PDF, JPG, PNG (max 20MB)
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) handleFileSelect(selectedFile)
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Select File
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Invoice preview"
                      className="w-32 h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                      <FileText className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setPreview(null)
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading || processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploading ? 'Uploading...' : 'Processing with OCR...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload and Process
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                  }}
                  disabled={uploading || processing}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {processing && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900">
                        Processing Invoice
                      </h3>
                      <p className="mt-1 text-sm text-blue-800">
                        Extracting text and parsing line items... This may take
                        5-10 seconds.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">How it works:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                  1
                </span>
                <span>Upload your supplier invoice (PDF or image)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                  2
                </span>
                <span>
                  Our OCR system extracts item names, prices, quantities, and
                  units
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                  3
                </span>
                <span>
                  Review and edit the extracted data - you can map to existing
                  materials or create new ones
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                  4
                </span>
                <span>
                  Confirm to update your materials inventory automatically
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}

function FileText({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}
