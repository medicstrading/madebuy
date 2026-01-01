'use client'

import { useMemo } from 'react'
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
} from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '@madebuy/shared'
import { cn } from '@/lib/utils'

interface TransactionTableProps {
  transactions: Transaction[]
  loading: boolean
  total: number
  page: number
  limit: number
  sortBy: 'createdAt' | 'gross' | 'net'
  sortOrder: 'asc' | 'desc'
  onSort: (column: 'createdAt' | 'gross' | 'net') => void
  onPageChange: (page: number) => void
  startingBalance?: number // Balance before the first transaction on current page
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}

export function TransactionTable({
  transactions,
  loading,
  total,
  page,
  limit,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  startingBalance = 0,
}: TransactionTableProps) {
  const totalPages = Math.ceil(total / limit)

  // Calculate running balance for each transaction
  // Since transactions are sorted newest first by default, we need to calculate backwards
  const transactionsWithBalance = useMemo(() => {
    // If sorting by date ascending, balance accumulates forward
    // If sorting by date descending (default), we need to work backwards
    if (sortBy !== 'createdAt') {
      // When not sorting by date, don't show running balance
      return transactions.map((t) => ({ ...t, runningBalance: null }))
    }

    const result: (Transaction & { runningBalance: number | null })[] = []
    let balance = startingBalance

    if (sortOrder === 'asc') {
      // Ascending: oldest first, balance goes forward
      for (const t of transactions) {
        balance += t.net
        result.push({ ...t, runningBalance: balance })
      }
    } else {
      // Descending: newest first, work backwards from end
      const reversedBalances: number[] = []
      let runningBalance = startingBalance

      // First pass: calculate end balance
      for (let i = transactions.length - 1; i >= 0; i--) {
        runningBalance += transactions[i].net
        reversedBalances.unshift(runningBalance)
      }

      // Second pass: assign balances
      for (let i = 0; i < transactions.length; i++) {
        result.push({ ...transactions[i], runningBalance: reversedBalances[i] })
      }
    }

    return result
  }, [transactions, sortBy, sortOrder, startingBalance])

  // Empty state
  if (!loading && transactions.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No transactions found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Transactions will appear here once you start making sales. Your complete
            financial history will be available for review and export.
          </p>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (loading && transactions.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Gross
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Fees
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Net
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="h-5 w-16 rounded-full bg-gray-200" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="ml-auto h-4 w-24 rounded bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="h-5 w-20 rounded-full bg-gray-200" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => onSort('createdAt')}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortBy === 'createdAt' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th
                onClick={() => onSort('gross')}
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Gross
                  {sortBy === 'gross' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Fees
              </th>
              <th
                onClick={() => onSort('net')}
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Net
                  {sortBy === 'net' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {transactionsWithBalance.map((transaction) => (
              <tr
                key={transaction.id}
                className={cn(
                  'transition-colors hover:bg-gray-50',
                  loading && 'opacity-50'
                )}
              >
                {/* Date */}
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDateShort(transaction.createdAt)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.createdAt).toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>

                {/* Type */}
                <td className="whitespace-nowrap px-6 py-4">
                  <TransactionTypeBadge type={transaction.type} />
                </td>

                {/* Description */}
                <td className="max-w-xs px-6 py-4">
                  <div className="truncate text-sm text-gray-900">
                    {transaction.description}
                  </div>
                  {transaction.orderId && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <span>Order: {transaction.orderId}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                </td>

                {/* Gross */}
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      transaction.type === 'sale' || transaction.type === 'adjustment'
                        ? 'text-green-600'
                        : transaction.type === 'refund'
                        ? 'text-red-600'
                        : 'text-gray-900'
                    )}
                  >
                    {transaction.type === 'sale' && '+'}
                    {transaction.type === 'refund' && '-'}
                    {formatCurrency(Math.abs(transaction.gross))}
                  </span>
                </td>

                {/* Fees */}
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                  {transaction.fees?.total ? (
                    <span className="text-red-500">
                      -{formatCurrency(transaction.fees.total)}
                    </span>
                  ) : (
                    <Minus className="ml-auto h-4 w-4 text-gray-300" />
                  )}
                </td>

                {/* Net */}
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      transaction.net > 0
                        ? 'text-green-600'
                        : transaction.net < 0
                        ? 'text-red-600'
                        : 'text-gray-900'
                    )}
                  >
                    {transaction.net > 0 && '+'}
                    {formatCurrency(transaction.net)}
                  </span>
                </td>

                {/* Running Balance */}
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {transaction.runningBalance !== null ? (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        transaction.runningBalance >= 0
                          ? 'text-gray-900'
                          : 'text-red-600'
                      )}
                    >
                      {formatCurrency(transaction.runningBalance)}
                    </span>
                  ) : (
                    <Minus className="ml-auto h-4 w-4 text-gray-300" />
                  )}
                </td>

                {/* Status */}
                <td className="whitespace-nowrap px-6 py-4">
                  <TransactionStatusBadge status={transaction.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
          <div className="text-sm text-gray-500">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of{' '}
            {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0 || loading}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {/* Page numbers */}
              {generatePageNumbers(page, totalPages).map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum as number)}
                    disabled={loading}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium',
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {(pageNum as number) + 1}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function generatePageNumbers(
  currentPage: number,
  totalPages: number
): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  const pages: (number | '...')[] = []

  // Always show first page
  pages.push(0)

  if (currentPage > 3) {
    pages.push('...')
  }

  // Show pages around current
  for (
    let i = Math.max(1, currentPage - 1);
    i <= Math.min(totalPages - 2, currentPage + 1);
    i++
  ) {
    pages.push(i)
  }

  if (currentPage < totalPages - 4) {
    pages.push('...')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages - 1)
  }

  return pages
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const config: Record<
    TransactionType,
    { label: string; className: string; icon: typeof ArrowUpRight }
  > = {
    sale: {
      label: 'Sale',
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: ArrowUpRight,
    },
    refund: {
      label: 'Refund',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: ArrowDownRight,
    },
    fee: {
      label: 'Fee',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: ArrowDownRight,
    },
    payout: {
      label: 'Payout',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: ArrowDownRight,
    },
    adjustment: {
      label: 'Adjust',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: ArrowUpRight,
    },
  }

  const { label, className, icon: Icon } = config[type] || config.adjustment

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config: Record<TransactionStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  }

  const { label, className } = config[status] || config.pending

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
    >
      {label}
    </span>
  )
}
