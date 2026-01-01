'use client'

import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import type { TransactionType } from '@madebuy/shared'

interface ExportButtonsProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  typeFilter?: TransactionType
}

/**
 * Export buttons component for ledger transactions
 * Provides CSV download and PDF statement generation
 */
export function ExportButtons({ dateRange, typeFilter }: ExportButtonsProps) {
  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  /**
   * Build query string from date range and filters
   */
  const buildQueryString = () => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    })

    if (typeFilter) {
      params.set('type', typeFilter)
    }

    return params.toString()
  }

  /**
   * Handle CSV export
   * Downloads the file directly via browser
   */
  const handleExportCSV = async () => {
    setCsvLoading(true)

    try {
      const response = await fetch(`/api/ledger/export/csv?${buildQueryString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export CSV')
      }

      // Get the filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'transactions.csv'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Create blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export error:', error)
      alert(error instanceof Error ? error.message : 'Failed to export CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  /**
   * Handle PDF export
   * Opens the statement in a new tab for printing
   */
  const handleExportPDF = async () => {
    setPdfLoading(true)

    try {
      // Open PDF statement in new tab
      const url = `/api/ledger/export/pdf?${buildQueryString()}`
      const pdfWindow = window.open(url, '_blank')

      if (!pdfWindow) {
        throw new Error('Please allow pop-ups to generate the PDF statement')
      }

      // Add a slight delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error('PDF export error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportCSV}
        disabled={csvLoading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Export as CSV"
      >
        {csvLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Export CSV</span>
      </button>

      <button
        onClick={handleExportPDF}
        disabled={pdfLoading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Generate PDF Statement"
      >
        {pdfLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span>PDF Statement</span>
      </button>
    </div>
  )
}

export default ExportButtons
