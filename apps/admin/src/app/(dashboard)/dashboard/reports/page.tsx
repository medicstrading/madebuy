'use client'

import type {
  QuarterlyGSTReport,
  TransactionStatus,
  TransactionType,
} from '@madebuy/shared'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  FileText,
  Filter,
  Loader2,
  Receipt,
  RefreshCw,
  Settings,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type TabId = 'ledger' | 'gst'

interface Transaction {
  id: string
  createdAt: string
  type: TransactionType
  description?: string
  orderId?: string
  grossAmount: number
  stripeFee: number
  platformFee: number
  netAmount: number
  currency: string
  status: TransactionStatus
}

interface Balance {
  totalGross: number
  totalStripeFees: number
  totalPlatformFees: number
  totalNet: number
  pendingBalance: number
  currency: string
}

interface GSTReportResponse {
  report: QuarterlyGSTReport
  tenant: {
    abn: string | null
    businessName: string
    gstRate: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: 'ledger', label: 'Transaction Ledger', icon: BookOpen },
  { id: 'gst', label: 'GST Summary', icon: Receipt },
]

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'sale', label: 'Sales' },
  { value: 'refund', label: 'Refunds' },
  { value: 'payout', label: 'Payouts' },
  { value: 'fee', label: 'Fees' },
  { value: 'subscription', label: 'Subscriptions' },
]

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function formatCurrencyCents(cents: number): string {
  return formatCurrency(cents / 100)
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function getQuarterOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

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

function getDefaultDescription(type: TransactionType): string {
  const descriptions: Record<TransactionType, string> = {
    sale: 'Order payment',
    refund: 'Order refund',
    payout: 'Payout to bank',
    fee: 'Platform fee',
    subscription: 'Subscription payment',
  }
  return descriptions[type]
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get('tab') as TabId) || 'ledger'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleTabChange = (tab: TabId) => {
    if (tab === activeTab) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTransitioning(false)
    }, 150)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Reports
        </h1>
        <p className="mt-1 text-gray-500">
          Financial reports and transaction history
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                type="button"
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2.5 px-5 py-3 text-sm font-medium transition-all duration-200',
                  'rounded-t-xl border border-b-0',
                  isActive
                    ? 'bg-white text-gray-900 border-gray-200 shadow-sm z-10 -mb-px'
                    : 'bg-gray-50/80 text-gray-500 border-transparent hover:bg-gray-100/80 hover:text-gray-700',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-400 group-hover:text-gray-500',
                  )}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          'transition-opacity duration-150',
          isTransitioning ? 'opacity-0' : 'opacity-100',
        )}
      >
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'gst' && <GSTTab />}
      </div>
    </div>
  )
}

// ============================================================================
// Ledger Tab
// ============================================================================

function LedgerTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [startDate, setStartDate] = useState(
    searchParams?.get('startDate') || '',
  )
  const [endDate, setEndDate] = useState(searchParams?.get('endDate') || '')
  const [txType, setTxType] = useState(searchParams?.get('type') || '')
  const [dateError, setDateError] = useState('')

  const page = parseInt(searchParams?.get('page') || '1', 10)
  const PAGE_SIZE = 50
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const isInvalidDateRange = !!(
    startDate &&
    endDate &&
    new Date(startDate) > new Date(endDate)
  )
  const hasFilter = startDate || endDate || txType

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (txType) params.set('type', txType)
        params.set('page', String(page))
        params.set('limit', String(PAGE_SIZE))

        const response = await fetch(`/api/transactions?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance)
          setTransactions(data.transactions || [])
          setTotalCount(data.totalCount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch ledger data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [page, startDate, endDate, txType])

  const applyFilter = useCallback(() => {
    if (isInvalidDateRange) {
      setDateError('Start date must be before end date')
      return
    }
    setDateError('')

    const params = new URLSearchParams()
    params.set('tab', 'ledger')
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (txType) params.set('type', txType)
    params.set('page', '1')

    router.push(`/dashboard/reports?${params.toString()}`)
  }, [router, startDate, endDate, txType, isInvalidDateRange])

  const clearFilter = useCallback(() => {
    setStartDate('')
    setEndDate('')
    setTxType('')
    setDateError('')
    router.push('/dashboard/reports?tab=ledger')
  }, [router])

  const exportCSV = useCallback(() => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (txType) params.set('type', txType)
    window.location.href = `/api/transactions/export?${params.toString()}`
  }, [startDate, endDate, txType])

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    if (!balance || !transactions.length) return []

    let runningBalance = balance.totalNet
    return transactions.map((tx) => {
      const result = { ...tx, runningBalance }
      if (tx.status === 'completed') {
        if (tx.type === 'sale' || tx.type === 'fee') {
          runningBalance -= tx.netAmount
        } else if (tx.type === 'refund' || tx.type === 'payout') {
          runningBalance += Math.abs(tx.netAmount)
        }
      }
      return result
    })
  }, [transactions, balance])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Loading transactions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {(isInvalidDateRange || dateError) && (
            <div className="text-sm text-red-600 self-center">
              {dateError || 'Start date must be before end date'}
            </div>
          )}

          <button
            type="button"
            onClick={applyFilter}
            disabled={isInvalidDateRange}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            Apply
          </button>

          {hasFilter && (
            <button
              type="button"
              onClick={clearFilter}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <div className="ml-auto">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard
            title="Total Revenue"
            value={balance.totalGross}
            currency={balance.currency}
            icon={DollarSign}
            color="emerald"
          />
          <BalanceCard
            title="Processing Fees"
            value={balance.totalStripeFees}
            currency={balance.currency}
            icon={ArrowDownRight}
            color="red"
          />
          <BalanceCard
            title="Net Earnings"
            value={balance.totalNet}
            currency={balance.currency}
            icon={ArrowUpRight}
            color="blue"
          />
          <BalanceCard
            title="Pending Balance"
            value={balance.pendingBalance}
            currency={balance.currency}
            icon={RefreshCw}
            color="amber"
          />
        </div>
      )}

      {/* Transactions Table */}
      {transactionsWithBalance.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No transactions yet"
          description="Your transaction history will appear here when you receive orders."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Net
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {transactionsWithBalance.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <TransactionTypeBadge type={tx.type} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {tx.description || getDefaultDescription(tx.type)}
                        </div>
                        {tx.orderId && (
                          <Link
                            href={`/dashboard/orders/${tx.orderId}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Order
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <span
                          className={
                            tx.type === 'refund' || tx.type === 'payout'
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }
                        >
                          {tx.type === 'refund' || tx.type === 'payout'
                            ? '-'
                            : ''}
                          {formatCurrency(tx.grossAmount, tx.currency)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                        {tx.stripeFee > 0
                          ? formatCurrency(tx.stripeFee, tx.currency)
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <span
                          className={
                            tx.type === 'refund' || tx.type === 'payout'
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }
                        >
                          {tx.type === 'refund' || tx.type === 'payout'
                            ? '-'
                            : '+'}
                          {formatCurrency(Math.abs(tx.netAmount), tx.currency)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <TransactionStatusBadge status={tx.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(tx.runningBalance, tx.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({totalCount} transactions)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/dashboard/reports?tab=ledger&page=${page - 1}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}${txType ? `&type=${txType}` : ''}`}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/dashboard/reports?tab=ledger&page=${page + 1}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}${txType ? `&type=${txType}` : ''}`}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// GST Tab
// ============================================================================

function GSTTab() {
  const quarterOptions = getQuarterOptions()
  const [selectedQuarter, setSelectedQuarter] = useState(
    quarterOptions[0].value,
  )
  const [report, setReport] = useState<GSTReportResponse | null>(null)
  const [error, setError] = useState<{ error: string; code?: string } | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/reports/gst?quarter=${selectedQuarter}`,
        )
        const data = await response.json()

        if (!response.ok) {
          setError(data)
          setReport(null)
        } else {
          setReport(data)
          setError(null)
        }
      } catch (_err) {
        setError({ error: 'Failed to load GST report' })
        setReport(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [selectedQuarter])

  const goToQuarter = (direction: 'prev' | 'next') => {
    const currentIndex = quarterOptions.findIndex(
      (q) => q.value === selectedQuarter,
    )
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (newIndex >= 0 && newIndex < quarterOptions.length) {
      setSelectedQuarter(quarterOptions[newIndex].value)
    }
  }

  const currentQuarterIndex = quarterOptions.findIndex(
    (q) => q.value === selectedQuarter,
  )
  const canGoNext = currentQuarterIndex > 0
  const canGoPrev = currentQuarterIndex < quarterOptions.length - 1

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Loading GST report...</p>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Quarter Selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goToQuarter('prev')}
          disabled={!canGoPrev}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {quarterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => goToQuarter('next')}
          disabled={!canGoNext}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {report && (
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export / Print
          </button>
        )}
      </div>

      {report && (
        <>
          {/* Business Info Banner */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Business</p>
                <p className="font-medium text-gray-900">
                  {report.tenant.businessName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ABN</p>
                <p className="font-medium text-gray-900">
                  {report.tenant.abn || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium text-gray-900">
                  {formatDate(report.report.startDate)} -{' '}
                  {formatDate(report.report.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GST Rate</p>
                <p className="font-medium text-gray-900">
                  {report.tenant.gstRate}%
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GST Collected</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrencyCents(report.report.gstCollected)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">
                  From {report.report.salesCount} sales
                </p>
                <p className="text-sm text-gray-900">
                  Gross: {formatCurrencyCents(report.report.salesGross)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GST on Refunds</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrencyCents(report.report.gstPaid)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">
                  From {report.report.refundsCount} refunds
                </p>
                <p className="text-sm text-gray-900">
                  Total: {formatCurrencyCents(report.report.refundsTotal)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">Net GST Payable</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrencyCents(report.report.netGst)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-blue-200 pt-4">
                <p className="text-xs text-blue-600">Amount to report on BAS</p>
                <p className="text-sm text-blue-700 font-medium">
                  {report.report.netGst >= 0
                    ? 'Payable to ATO'
                    : 'Claimable from ATO'}
                </p>
              </div>
            </div>
          </div>

          {/* BAS Summary Breakdown */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="font-semibold text-gray-900">BAS Summary</h2>
              <p className="text-sm text-gray-500">
                Key figures for your Business Activity Statement
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              <BASRow
                code="G1"
                label="Total Sales"
                sublabel="Including GST"
                value={formatCurrencyCents(report.report.salesGross)}
              />
              <BASRow
                code="1A"
                label="GST on Sales"
                sublabel="GST collected from customers"
                value={formatCurrencyCents(report.report.gstCollected)}
                valueColor="text-emerald-600"
              />
              <BASRow
                code="1B"
                label="GST on Refunds"
                sublabel="GST returned with refunds"
                value={`-${formatCurrencyCents(report.report.gstPaid)}`}
                valueColor="text-red-600"
              />
              <div className="flex items-center justify-between bg-blue-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Net GST Payable</p>
                    <p className="text-sm text-blue-600">1A minus 1B</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrencyCents(report.report.netGst)}
                </p>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-medium text-amber-900">Important Note</h3>
                <p className="mt-1 text-sm text-amber-700">
                  This summary shows GST from sales processed through MadeBuy
                  only. If you have other business income or expenses, consult
                  your accountant for your complete BAS figures. Input tax
                  credits from business purchases are not included in this
                  report.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Shared Components
// ============================================================================

function BalanceCard({
  title,
  value,
  currency,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  currency: string
  icon: typeof DollarSign
  color: 'emerald' | 'red' | 'blue' | 'amber'
}) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(value, currency)}
          </p>
        </div>
        <div className={cn('rounded-lg p-2', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function BASRow({
  code,
  label,
  sublabel,
  value,
  valueColor,
}: {
  code: string
  label: string
  sublabel: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
          {code}
        </span>
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">{sublabel}</p>
        </div>
      </div>
      <p className={cn('text-lg font-semibold', valueColor || 'text-gray-900')}>
        {value}
      </p>
    </div>
  )
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const colors: Record<TransactionType, string> = {
    sale: 'bg-emerald-50 text-emerald-700',
    refund: 'bg-orange-50 text-orange-700',
    payout: 'bg-blue-50 text-blue-700',
    fee: 'bg-gray-100 text-gray-700',
    subscription: 'bg-purple-50 text-purple-700',
  }

  const labels: Record<TransactionType, string> = {
    sale: 'Sale',
    refund: 'Refund',
    payout: 'Payout',
    fee: 'Fee',
    subscription: 'Subscription',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        colors[type],
      )}
    >
      {labels[type]}
    </span>
  )
}

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const colors: Record<TransactionStatus, string> = {
    pending: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    reversed: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        colors[status],
      )}
    >
      {status}
    </span>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}
