'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import type { QuarterlyGSTReport } from '@madebuy/shared'

interface GSTReportResponse {
  report: QuarterlyGSTReport
  tenant: {
    abn: string | null
    businessName: string
    gstRate: number
  }
}

interface ErrorResponse {
  error: string
  code?: string
}

// Generate quarter options for the last 2 years
function getQuarterOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  // Go back 8 quarters (2 years)
  for (let i = 0; i < 8; i++) {
    let quarter = currentQuarter - i
    let year = currentYear

    while (quarter <= 0) {
      quarter += 4
      year -= 1
    }

    const quarterStr = `${year}-Q${quarter}`
    const quarterNames = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
    options.push({
      value: quarterStr,
      label: `${quarterNames[quarter - 1]} ${year}`,
    })
  }

  return options
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default function GSTSummaryPage() {
  const quarterOptions = getQuarterOptions()
  const [selectedQuarter, setSelectedQuarter] = useState(quarterOptions[0].value)
  const [report, setReport] = useState<GSTReportResponse | null>(null)
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch report when quarter changes
  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/reports/gst?quarter=${selectedQuarter}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data as ErrorResponse)
          setReport(null)
        } else {
          setReport(data as GSTReportResponse)
          setError(null)
        }
      } catch (err) {
        setError({ error: 'Failed to load GST report' })
        setReport(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [selectedQuarter])

  // Navigate to previous/next quarter
  const goToQuarter = (direction: 'prev' | 'next') => {
    const currentIndex = quarterOptions.findIndex((q) => q.value === selectedQuarter)
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1

    if (newIndex >= 0 && newIndex < quarterOptions.length) {
      setSelectedQuarter(quarterOptions[newIndex].value)
    }
  }

  // Handle print/export
  const handleExport = () => {
    window.print()
  }

  const currentQuarterIndex = quarterOptions.findIndex((q) => q.value === selectedQuarter)
  const canGoNext = currentQuarterIndex > 0
  const canGoPrev = currentQuarterIndex < quarterOptions.length - 1

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Summary</h1>
          <p className="mt-1 text-gray-500">
            Quarterly GST report for BAS (Business Activity Statement)
          </p>
        </div>

        {report && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export / Print
          </button>
        )}
      </div>

      {/* Quarter Selector */}
      <div className="flex items-center justify-center gap-4 print:hidden">
        <button
          onClick={() => goToQuarter('prev')}
          disabled={!canGoPrev}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous quarter"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {quarterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => goToQuarter('next')}
          disabled={!canGoNext}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next quarter"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">GST Summary Report</h1>
        {report && (
          <p className="text-sm text-gray-600">
            {report.tenant.businessName} | ABN: {report.tenant.abn || 'Not registered'} |{' '}
            {quarterOptions.find((q) => q.value === selectedQuarter)?.label}
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-gray-500">Loading GST report...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {error.code === 'GST_NOT_REGISTERED'
              ? 'GST Not Registered'
              : 'Unable to Load Report'}
          </h3>
          <p className="mt-2 text-gray-500">{error.error}</p>
          {error.code === 'GST_NOT_REGISTERED' && (
            <Link
              href="/dashboard/settings/tax"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Settings className="h-4 w-4" />
              Go to Tax Settings
            </Link>
          )}
        </div>
      )}

      {/* Report Content */}
      {report && !isLoading && (
        <>
          {/* Business Info Banner */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 print:border-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Business</p>
                <p className="font-medium text-gray-900">{report.tenant.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ABN</p>
                <p className="font-medium text-gray-900">{report.tenant.abn || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium text-gray-900">
                  {formatDate(report.report.startDate)} - {formatDate(report.report.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GST Rate</p>
                <p className="font-medium text-gray-900">{report.tenant.gstRate}%</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3 print:grid-cols-3 print:gap-4">
            {/* GST Collected */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 print:bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GST Collected</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.report.gstCollected)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">From {report.report.salesCount} sales</p>
                <p className="text-sm text-gray-900">
                  Gross: {formatCurrency(report.report.salesGross)}
                </p>
              </div>
            </div>

            {/* GST Paid (Refunds) */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 print:bg-red-50">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GST on Refunds</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.report.gstPaid)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">From {report.report.refundsCount} refunds</p>
                <p className="text-sm text-gray-900">
                  Total: {formatCurrency(report.report.refundsTotal)}
                </p>
              </div>
            </div>

            {/* Net GST */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 print:border-blue-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">Net GST Payable</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(report.report.netGst)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-blue-200 pt-4">
                <p className="text-xs text-blue-600">Amount to report on BAS</p>
                <p className="text-sm text-blue-700 font-medium">
                  {report.report.netGst >= 0 ? 'Payable to ATO' : 'Claimable from ATO'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden print:border-gray-300">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="font-semibold text-gray-900">BAS Summary</h2>
              <p className="text-sm text-gray-500">Key figures for your Business Activity Statement</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
                    G1
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">Total Sales</p>
                    <p className="text-sm text-gray-500">Including GST</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(report.report.salesGross)}
                </p>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
                    1A
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">GST on Sales</p>
                    <p className="text-sm text-gray-500">GST collected from customers</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(report.report.gstCollected)}
                </p>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
                    1B
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">GST on Refunds</p>
                    <p className="text-sm text-gray-500">GST returned with refunds</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-red-600">
                  -{formatCurrency(report.report.gstPaid)}
                </p>
              </div>

              <div className="flex items-center justify-between bg-blue-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Net GST Payable</p>
                    <p className="text-sm text-blue-600">1A minus 1B</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(report.report.netGst)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 print:border-yellow-300">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-900">Important Note</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This summary shows GST from sales processed through MadeBuy only. If you have other
                  business income or expenses, consult your accountant for your complete BAS figures.
                  Input tax credits from business purchases are not included in this report.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
