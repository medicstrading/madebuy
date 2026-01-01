'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileBarChart,
  Calendar,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Receipt,
  TrendingUp,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GSTReport {
  period: {
    type: string
    startDate: string
    endDate: string
    label: string
  }
  gstRegistered: boolean
  abn: string | null
  totalSalesInclGST: number
  totalSalesExclGST: number
  gstCollected: number
  gstOnPurchases: number
  netGSTPayable: number
  salesCount: number
  refundCount: number
  refundAmount: number
}

interface BASReport {
  quarter: string
  financialYear: string
  periodLabel: string
  startDate: string
  endDate: string
  businessName: string
  abn: string | null
  gstRegistered: boolean
  G1_TotalSales: number
  G6_TotalTaxableSales: number
  label_1A_GSTOnSales: number
  label_1B_GSTOnPurchases: number
  label_9_NetGSTPayable: number
}

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jul-Sep)' },
  { value: 'Q2', label: 'Q2 (Oct-Dec)' },
  { value: 'Q3', label: 'Q3 (Jan-Mar)' },
  { value: 'Q4', label: 'Q4 (Apr-Jun)' },
]

function getCurrentQuarter(): string {
  const month = new Date().getMonth()
  if (month >= 6 && month <= 8) return 'Q1'
  if (month >= 9 && month <= 11) return 'Q2'
  if (month >= 0 && month <= 2) return 'Q3'
  return 'Q4'
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'gst' | 'bas'>('gst')
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [gstReport, setGstReport] = useState<GSTReport | null>(null)
  const [basReport, setBasReport] = useState<BASReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGSTReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/reports/gst?quarter=${selectedQuarter}&year=${selectedYear}`
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch GST report')
      }
      const data = await response.json()
      setGstReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [selectedQuarter, selectedYear])

  const fetchBASReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/reports/bas?quarter=${selectedQuarter}&year=${selectedYear}`
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch BAS report')
      }
      const data = await response.json()
      setBasReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [selectedQuarter, selectedYear])

  useEffect(() => {
    if (activeTab === 'gst') {
      fetchGSTReport()
    } else {
      fetchBASReport()
    }
  }, [activeTab, fetchGSTReport, fetchBASReport])

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Reports</h1>
          <p className="mt-1 text-gray-500">GST and BAS reports for Australian tax compliance</p>
        </div>
        <button
          onClick={activeTab === 'gst' ? fetchGSTReport : fetchBASReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('gst')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'gst'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              GST Summary
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bas')}
            className={cn(
              'py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'bas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <span className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              BAS Preparation
            </span>
          </button>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Period:</span>
        </div>
        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {QUARTERS.map((q) => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>FY {y}/{parseInt(y) + 1}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {activeTab === 'gst' && gstReport && !loading && (
        <div className="space-y-6">
          {!gstReport.gstRegistered && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">GST Registration Required</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Register for GST once turnover exceeds $75,000. Update in Settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Sales (incl GST)" value={formatCurrency(gstReport.totalSalesInclGST)} icon={DollarSign} color="blue" subtitle={`${gstReport.salesCount} sales`} />
            <SummaryCard title="GST Collected" value={formatCurrency(gstReport.gstCollected)} icon={Receipt} color="green" subtitle="1/11 of taxable sales" />
            <SummaryCard title="GST on Purchases" value={formatCurrency(gstReport.gstOnPurchases)} icon={TrendingUp} color="purple" subtitle="Input tax credits" />
            <SummaryCard title="Net GST Payable" value={formatCurrency(gstReport.netGSTPayable)} icon={Building2} color="amber" subtitle="Amount owing to ATO" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">GST Summary - {gstReport.period.label}</h2>
              <p className="text-sm text-gray-500">{formatDate(gstReport.period.startDate)} - {formatDate(gstReport.period.endDate)}</p>
            </div>
            <div className="p-6">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-3 text-sm text-gray-600">Total Sales (incl GST)</td><td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(gstReport.totalSalesInclGST)}</td></tr>
                  <tr><td className="py-3 text-sm text-gray-600">Total Sales (excl GST)</td><td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(gstReport.totalSalesExclGST)}</td></tr>
                  <tr><td className="py-3 text-sm text-gray-600">GST Collected (1A)</td><td className="py-3 text-right text-sm font-semibold text-green-600">{formatCurrency(gstReport.gstCollected)}</td></tr>
                  <tr><td className="py-3 text-sm text-gray-600">GST on Purchases (1B)</td><td className="py-3 text-right text-sm font-medium text-purple-600">{formatCurrency(gstReport.gstOnPurchases)}</td></tr>
                  <tr className="bg-gray-50"><td className="py-3 pl-2 text-sm font-semibold text-gray-900">Net GST Payable</td><td className="py-3 pr-2 text-right text-sm font-bold text-amber-600">{formatCurrency(gstReport.netGSTPayable)}</td></tr>
                  <tr><td className="py-3 text-sm text-gray-600">Refunds Processed</td><td className="py-3 text-right text-sm font-medium text-red-600">-{formatCurrency(gstReport.refundAmount)} ({gstReport.refundCount} refunds)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bas' && basReport && !loading && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{basReport.businessName}</h2>
                <p className="text-sm text-gray-500">ABN: {basReport.abn || 'Not registered'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{basReport.periodLabel}</p>
                <p className="text-sm text-gray-500">{formatDate(basReport.startDate)} - {formatDate(basReport.endDate)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">BAS Worksheet - {basReport.quarter} FY{basReport.financialYear}</h2>
              <p className="text-sm text-gray-500">Use these figures when completing your BAS online</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">GST on Sales</h3>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-3 text-sm text-gray-600">G1 - Total Sales</td><td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(basReport.G1_TotalSales * 100)}</td></tr>
                    <tr><td className="py-3 text-sm text-gray-600">G6 - Total Taxable Sales</td><td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(basReport.G6_TotalTaxableSales * 100)}</td></tr>
                    <tr className="bg-green-50"><td className="py-3 pl-2 text-sm font-semibold text-green-800">1A - GST on Sales</td><td className="py-3 pr-2 text-right text-sm font-bold text-green-700">{formatCurrency(basReport.label_1A_GSTOnSales * 100)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">GST on Purchases</h3>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-purple-50"><td className="py-3 pl-2 text-sm font-semibold text-purple-800">1B - GST on Purchases</td><td className="py-3 pr-2 text-right text-sm font-bold text-purple-700">{formatCurrency(basReport.label_1B_GSTOnPurchases * 100)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">9 - Net GST Payable</p>
                    <p className="text-xs text-amber-600 mt-1">1A minus 1B</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(basReport.label_9_NetGSTPayable * 100)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-800">How to lodge your BAS</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>1. Log in to your ATO Business Portal or myGov</li>
              <li>2. Select &quot;Lodge BAS&quot;</li>
              <li>3. Enter the figures from this worksheet</li>
              <li>4. Review and submit</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: string; icon: React.ElementType; color: 'blue' | 'green' | 'purple' | 'amber'; subtitle: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  }

  return (
    <div className={cn('rounded-xl border p-5', colorClasses[color])}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('rounded-lg p-2', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium opacity-80">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-1">{subtitle}</p>
    </div>
  )
}
