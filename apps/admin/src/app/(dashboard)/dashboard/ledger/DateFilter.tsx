'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Filter, X, Download } from 'lucide-react'

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'sale', label: 'Sales' },
  { value: 'refund', label: 'Refunds' },
  { value: 'payout', label: 'Payouts' },
  { value: 'fee', label: 'Fees' },
  { value: 'subscription', label: 'Subscriptions' },
]

export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState(searchParams?.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams?.get('endDate') || '')
  const [txType, setTxType] = useState(searchParams?.get('type') || '')

  const applyFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')

    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }

    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }

    if (txType) {
      params.set('type', txType)
    } else {
      params.delete('type')
    }

    // Reset to page 1 when filtering
    params.set('page', '1')

    router.push(`/dashboard/ledger?${params.toString()}`)
  }, [router, searchParams, startDate, endDate, txType])

  const clearFilter = useCallback(() => {
    setStartDate('')
    setEndDate('')
    setTxType('')
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('startDate')
    params.delete('endDate')
    params.delete('type')
    params.set('page', '1')
    router.push(`/dashboard/ledger?${params.toString()}`)
  }, [router, searchParams])

  const hasFilter = startDate || endDate || txType

  const exportCSV = useCallback(() => {
    // Build export URL with current filters
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (txType) params.set('type', txType)

    // Trigger download
    window.location.href = `/api/transactions/export?${params.toString()}`
  }, [startDate, endDate, txType])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="txType" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="txType"
          value={txType}
          onChange={(e) => setTxType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          {TRANSACTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
          From
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
          To
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <button
        onClick={applyFilter}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Filter className="h-4 w-4" />
        Apply Filter
      </button>

      {hasFilter && (
        <button
          onClick={clearFilter}
          className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      )}

      <div className="ml-auto">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
    </div>
  )
}
