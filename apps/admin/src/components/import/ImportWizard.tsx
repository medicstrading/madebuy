'use client'

import { useState, useCallback } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  ChevronRight,
  ArrowLeft,
  X,
  MapPin,
} from 'lucide-react'
import type {
  ImportJob,
  ImportPreview,
  ImportError,
  ImportWarning,
  ColumnMapping,
  ImportSource,
} from '@madebuy/shared'

interface ImportWizardProps {
  onComplete?: () => void
}

type Step = 'upload' | 'mapping' | 'preview' | 'processing' | 'complete'

const SOURCE_LABELS: Record<ImportSource, string> = {
  madebuy: 'MadeBuy',
  shopify: 'Shopify',
  etsy: 'Etsy',
  woocommerce: 'WooCommerce',
  custom: 'Custom',
}

const MADEBUY_FIELDS = [
  { key: 'handle', label: 'Handle/Slug', required: true },
  { key: 'name', label: 'Product Name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'price', label: 'Price', required: false },
  { key: 'stock', label: 'Stock', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'tags', label: 'Tags', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'imageUrl', label: 'Image URL', required: false },
  { key: 'imagePosition', label: 'Image Position', required: false },
] as const

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload')
  const [job, setJob] = useState<ImportJob | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [errors, setErrors] = useState<ImportError[]>([])
  const [warnings, setWarnings] = useState<ImportWarning[]>([])
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [updateExisting, setUpdateExisting] = useState(false)
  const [skipErrors, setSkipErrors] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setJob(data.job)
      setDetectedColumns(data.detectedColumns)
      setMapping(data.suggestedMapping || {})
      setStep('mapping')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file)
    } else {
      setUploadError('Please upload a CSV file')
    }
  }, [])

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Validate mapping
  const handleValidate = async () => {
    if (!job) return

    setIsValidating(true)

    try {
      const response = await fetch(`/api/import/${job.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapping,
          updateExisting,
          skipErrors,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setJob(data.job)
      setPreview(data.preview)
      setErrors(data.errors || [])
      setWarnings(data.warnings || [])
      setStep('preview')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  // Start import
  const handleConfirm = async () => {
    if (!job) return

    setIsProcessing(true)
    setStep('processing')

    try {
      const response = await fetch(`/api/import/${job.id}/confirm`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setJob(data.job)
      setStep('complete')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Import failed')
      setStep('preview')
    } finally {
      setIsProcessing(false)
    }
  }

  // Update mapping
  const handleMappingChange = (field: keyof ColumnMapping, column: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: column || undefined,
    }))
  }

  // Reset wizard
  const handleReset = () => {
    setStep('upload')
    setJob(null)
    setPreview(null)
    setErrors([])
    setWarnings([])
    setDetectedColumns([])
    setMapping({})
    setUploadError(null)
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <ChevronRight className="mx-2 h-4 w-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
        {step !== 'upload' && step !== 'processing' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Download Template */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="font-medium text-gray-900">Need a template?</p>
              <p className="text-sm text-gray-500">
                Download our CSV template with all supported columns
              </p>
            </div>
            <a
              href="/api/import/template"
              download
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download Template
            </a>
          </div>

          {/* Upload Area */}
          <div
            className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-gray-600">Uploading and analyzing CSV...</p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Drop your CSV file here
                </p>
                <p className="mt-2 text-gray-500">
                  or click to browse your computer
                </p>
                <p className="mt-4 text-sm text-gray-400">
                  Supports Shopify, Etsy, WooCommerce, and MadeBuy formats
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{uploadError}</p>
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && job && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <FileText className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{job.filename}</p>
              <p className="text-sm text-gray-500">
                {job.rowCount} rows detected • {SOURCE_LABELS[job.source]} format
              </p>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Column Mapping</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Map your CSV columns to MadeBuy fields
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {MADEBUY_FIELDS.map(({ key, label, required }) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">{label}</span>
                    {required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </div>
                  <select
                    value={mapping[key as keyof ColumnMapping] || ''}
                    onChange={(e) =>
                      handleMappingChange(key as keyof ColumnMapping, e.target.value)
                    }
                    className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select column --</option>
                    {detectedColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Import Options</h3>
            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Update existing products</p>
                  <p className="text-sm text-gray-500">
                    Products with matching handle/slug will be updated instead of skipped
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Skip rows with errors</p>
                  <p className="text-sm text-gray-500">
                    Continue importing other products even if some rows have errors
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleValidate}
              disabled={!mapping.handle || !mapping.name || isValidating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Validate
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {preview.productsDetected}
              </p>
              <p className="text-sm text-gray-500">Products</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {preview.imagesDetected}
              </p>
              <p className="text-sm text-gray-500">Images</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              <p className="text-sm text-gray-500">Errors</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {warnings.length}
              </p>
              <p className="text-sm text-gray-500">Warnings</p>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 border-b border-red-200 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">
                  {errors.length} Error{errors.length > 1 ? 's' : ''} Found
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto p-4">
                {errors.slice(0, 20).map((error, i) => (
                  <div key={i} className="flex gap-2 py-1 text-sm text-red-700">
                    <span className="font-mono text-red-500">Row {error.row}:</span>
                    <span>{error.message}</span>
                  </div>
                ))}
                {errors.length > 20 && (
                  <p className="mt-2 text-sm text-red-600">
                    ...and {errors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50">
              <div className="flex items-center gap-2 border-b border-yellow-200 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto p-4">
                {warnings.slice(0, 10).map((warning, i) => (
                  <div key={i} className="flex gap-2 py-1 text-sm text-yellow-700">
                    <span className="font-mono text-yellow-600">Row {warning.row}:</span>
                    <span>{warning.message}</span>
                  </div>
                ))}
                {warnings.length > 10 && (
                  <p className="mt-2 text-sm text-yellow-600">
                    ...and {warnings.length - 10} more warnings
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sample Rows */}
          {preview.sampleRows.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">Preview</h3>
                <p className="text-sm text-gray-500">First 5 products to be imported</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Handle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {preview.sampleRows.map((row, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900">
                          {row.handle}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {row.price ? `$${row.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {row.stock ?? 'Unlimited'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {row.category || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('mapping')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mapping
            </button>
            <button
              onClick={handleConfirm}
              disabled={errors.length > 0 && !skipErrors}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Import
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
          <p className="mt-6 text-xl font-medium text-gray-900">Importing Products...</p>
          <p className="mt-2 text-gray-500">
            This may take a few minutes. Please don&apos;t close this page.
          </p>
        </div>
      )}

      {step === 'complete' && job && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="mt-4 text-xl font-medium text-gray-900">Import Complete!</p>
          </div>

          {/* Results */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {job.productsCreated}
              </p>
              <p className="text-sm text-gray-600">Created</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {job.productsUpdated}
              </p>
              <p className="text-sm text-gray-600">Updated</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {job.productsSkipped}
              </p>
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {job.imagesDownloaded}
              </p>
              <p className="text-sm text-gray-600">Images</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Import More
            </button>
            <a
              href="/dashboard/inventory"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              View Inventory
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
