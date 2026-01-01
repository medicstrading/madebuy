'use client'

import { useState } from 'react'
import { Shipment } from '@madebuy/shared'
import { Printer, Download, FileText, Loader2 } from 'lucide-react'

interface PrintLabelProps {
  shipment: Shipment
}

type LabelSize = 'a4' | '4x6'
type LabelFormat = 'pdf' | 'png'

export function PrintLabel({ shipment }: PrintLabelProps) {
  const [size, setSize] = useState<LabelSize>('a4')
  const [format, setFormat] = useState<LabelFormat>('pdf')
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    if (!shipment.labelUrl) return

    setLoading(true)
    try {
      // Open label in new window for printing
      const printWindow = window.open(shipment.labelUrl, '_blank')
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print()
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/fulfillment/label/${shipment.id}?format=${format}&size=${size}`)

      if (!response.ok) {
        throw new Error('Failed to download label')
      }

      const data = await response.json()

      // Create download link
      const link = document.createElement('a')
      link.href = data.labelUrl
      link.download = `label-${shipment.trackingNumber || shipment.id}.${format}`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!shipment.labelUrl) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-center text-gray-500">
        No label available yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Label Preview */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700">Shipping Label</p>
        </div>
        <div className="p-4 bg-white">
          {/* Label preview iframe */}
          <div className="aspect-[3/4] max-h-96 bg-gray-100 rounded-lg overflow-hidden">
            <iframe
              src={shipment.labelUrl}
              className="w-full h-full"
              title="Shipping Label Preview"
            />
          </div>
        </div>
      </div>

      {/* Size and Format Selection */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSize('a4')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                size === 'a4'
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              A4
            </button>
            <button
              onClick={() => setSize('4x6')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                size === '4x6'
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              4x6
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('pdf')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                format === 'pdf'
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setFormat('png')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                format === 'png'
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              PNG
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePrint}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          Print Label
        </button>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download {format.toUpperCase()}
        </button>

        {shipment.trackingUrl && (
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            View Tracking
          </a>
        )}
      </div>
    </div>
  )
}
