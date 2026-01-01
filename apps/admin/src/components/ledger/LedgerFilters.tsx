'use client'

import { useState, useEffect, useCallback } from 'react'
import { Filter, Search, X, Calendar } from 'lucide-react'
import type { TransactionType, TransactionStatus } from '@madebuy/shared'
import { cn } from '@/lib/utils'

const TRANSACTION_TYPES: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'sale', label: 'Sales' },
  { value: 'refund', label: 'Refunds' },
  { value: 'fee', label: 'Fees' },
  { value: 'payout', label: 'Payouts' },
  { value: 'adjustment', label: 'Adjustments' },
]

const TRANSACTION_STATUSES: { value: TransactionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

export interface LedgerFiltersState {
  typeFilter: TransactionType | 'all'
  statusFilter: TransactionStatus | 'all'
  dateRange: string
  customStartDate: string
  customEndDate: string
  search: string
}

interface LedgerFiltersProps {
  filters: LedgerFiltersState
  onFiltersChange: (filters: LedgerFiltersState) => void
  totalCount: number
  loading?: boolean
}

export function LedgerFilters({
  filters,
  onFiltersChange,
  totalCount,
  loading = false,
}: LedgerFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters, onFiltersChange])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    onFiltersChange({ ...filters, search: '' })
  }, [filters, onFiltersChange])

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    onFiltersChange({
      typeFilter: 'all',
      statusFilter: 'all',
      dateRange: '30d',
      customStartDate: '',
      customEndDate: '',
      search: '',
    })
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.typeFilter !== 'all' ||
    filters.statusFilter !== 'all' ||
    filters.dateRange !== '30d' ||
    filters.search !== ''

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Filter Icon */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filters:</span>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search description or order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          value={filters.typeFilter}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              typeFilter: e.target.value as TransactionType | 'all',
            })
          }
          className={cn(
            'rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            filters.typeFilter !== 'all'
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300'
          )}
        >
          {TRANSACTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.statusFilter}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              statusFilter: e.target.value as TransactionStatus | 'all',
            })
          }
          className={cn(
            'rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            filters.statusFilter !== 'all'
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300'
          )}
        >
          {TRANSACTION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={filters.dateRange}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateRange: e.target.value })
            }
            className={cn(
              'rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              filters.dateRange !== '30d'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-300'
            )}
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range Inputs */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.customStartDate}
              onChange={(e) =>
                onFiltersChange({ ...filters, customStartDate: e.target.value })
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.customEndDate}
              onChange={(e) =>
                onFiltersChange({ ...filters, customEndDate: e.target.value })
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}

        {/* Transaction Count */}
        <span
          className={cn(
            'ml-auto text-sm',
            loading ? 'text-gray-400' : 'text-gray-500'
          )}
        >
          {loading ? 'Loading...' : `${totalCount} transaction${totalCount !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )
}
