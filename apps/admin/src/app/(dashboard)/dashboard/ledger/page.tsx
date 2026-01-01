'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '@madebuy/shared'
import { LedgerFilters, type LedgerFiltersState, ExportButtons } from '@/components/ledger'
import { TransactionTable } from '@/components/ledger/TransactionTable'

const LIMIT = 25

function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Calculate date range from filter state
 */
function getDateRangeFromFilters(filters: LedgerFiltersState): { startDate: Date; endDate: Date } {
  const now = new Date()
  let startDate: Date
  let endDate: Date = now

  if (filters.dateRange === 'custom' && filters.customStartDate) {
    startDate = new Date(filters.customStartDate)
    if (filters.customEndDate) {
      endDate = new Date(filters.customEndDate)
      endDate.setHours(23, 59, 59, 999)
    }
  } else {
    switch (filters.dateRange) {
      case '7d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
      default:
        // For "all time", go back 5 years as a reasonable default
        startDate = new Date(now.getFullYear() - 5, 0, 1)
        break
    }
  }

  return { startDate, endDate }
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [filters, setFilters] = useState<LedgerFiltersState>({
    typeFilter: 'all',
    statusFilter: 'all',
    dateRange: '30d',
    customStartDate: '',
    customEndDate: '',
    search: '',
  })

  // Pagination
  const [page, setPage] = useState(0)

  // Sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'gross' | 'net'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (filters.typeFilter !== 'all') {
        params.set('type', filters.typeFilter)
      }

      if (filters.statusFilter !== 'all') {
        params.set('status', filters.statusFilter)
      }

      if (filters.search) {
        params.set('search', filters.search)
      }

      // Calculate date range
      const now = new Date()
      let startDate: Date | null = null
      let endDate: Date = now

      if (filters.dateRange === 'custom' && filters.customStartDate) {
        startDate = new Date(filters.customStartDate)
        if (filters.customEndDate) {
          endDate = new Date(filters.customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
      } else if (filters.dateRange !== 'all') {
        switch (filters.dateRange) {
          case '7d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 7)
            break
          case '30d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 30)
            break
          case '90d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 90)
            break
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
        }
      }

      if (startDate) {
        params.set('startDate', startDate.toISOString())
      }
      if (filters.dateRange !== 'all') {
        params.set('endDate', endDate.toISOString())
      }

      params.set('limit', LIMIT.toString())
      params.set('offset', (page * LIMIT).toString())
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      const response = await fetch(`/api/ledger?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters, page, sortBy, sortOrder])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [filters])

  const handleSort = (column: 'createdAt' | 'gross' | 'net') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleFiltersChange = (newFilters: LedgerFiltersState) => {
    setFilters(newFilters)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Transaction Ledger
          </h1>
          <p className="mt-1 text-gray-500">
            Complete history of all financial transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportButtons
            dateRange={getDateRangeFromFilters(filters)}
            typeFilter={filters.typeFilter !== 'all' ? filters.typeFilter : undefined}
          />
        </div>
      </div>

      {/* Filters */}
      <LedgerFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalCount={total}
        loading={loading}
      />

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to load transactions
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchTransactions}
              className="ml-auto rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
        total={total}
        page={page}
        limit={LIMIT}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onPageChange={setPage}
      />

      {/* Quick Stats Footer */}
      {transactions.length > 0 && !loading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500">Total Gross:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    transactions.reduce((sum, t) => sum + t.gross, 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Fees:</span>{' '}
                <span className="font-semibold text-red-600">
                  -
                  {formatCurrency(
                    transactions.reduce((sum, t) => sum + (t.fees?.total || 0), 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Net:</span>{' '}
                <span className="font-semibold text-green-600">
                  {formatCurrency(
                    transactions.reduce((sum, t) => sum + t.net, 0)
                  )}
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              Showing page {page + 1} of {Math.ceil(total / LIMIT)} ({total}{' '}
              total)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}
