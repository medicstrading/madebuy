'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Calendar, X } from 'lucide-react'

export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  const applyFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

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

    // Reset to page 1 when filtering
    params.set('page', '1')

    router.push(`/dashboard/ledger?${params.toString()}`)
  }, [router, searchParams, startDate, endDate])

  const clearFilter = useCallback(() => {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    params.set('page', '1')
    router.push(`/dashboard/ledger?${params.toString()}`)
  }, [router, searchParams])

  const hasFilter = startDate || endDate

  return (
    <div className="flex flex-wrap items-end gap-3">
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
        <Calendar className="h-4 w-4" />
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
    </div>
  )
}
