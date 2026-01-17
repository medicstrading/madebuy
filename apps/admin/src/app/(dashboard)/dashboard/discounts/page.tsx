'use client'

import type { DiscountCode, DiscountStats } from '@madebuy/shared'
import { Edit, Plus, Tag, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([])
  const [stats, setStats] = useState<DiscountStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDiscounts()
    fetchStats()
  }, [fetchDiscounts, fetchStats])

  async function fetchDiscounts() {
    try {
      const res = await fetch('/api/discounts')
      const data = await res.json()
      setDiscounts(data.items || [])
    } catch (error) {
      console.error('Failed to fetch discounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/discounts/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function toggleActive(id: string, currentState: boolean) {
    try {
      await fetch(`/api/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })
      fetchDiscounts()
    } catch (error) {
      console.error('Failed to toggle discount:', error)
    }
  }

  async function deleteDiscount(id: string) {
    if (!confirm('Are you sure you want to delete this discount code?')) return

    try {
      await fetch(`/api/discounts/${id}`, { method: 'DELETE' })
      fetchDiscounts()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete discount:', error)
    }
  }

  function formatValue(discount: DiscountCode) {
    if (discount.type === 'percentage') return `${discount.value}%`
    if (discount.type === 'fixed') return `$${discount.value.toFixed(2)}`
    return 'Free Shipping'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-500 mt-1">
            Create and manage promotional codes
          </p>
        </div>
        <Link
          href="/dashboard/discounts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Discount
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total Codes</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalCodes}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.activeCodes}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total Uses</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats.totalUsage}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Expired Codes</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {stats.expiredCodes}
            </p>
          </div>
        </div>
      )}

      {/* Discount List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {discounts.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No discount codes yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first discount code to offer special deals to
              customers.
            </p>
            <Link
              href="/dashboard/discounts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Discount
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uses
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {discounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {discount.code}
                      </span>
                      {discount.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {discount.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {discount.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatValue(discount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {discount.usageCount}
                        {discount.maxUses && ` / ${discount.maxUses}`}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleActive(discount.id, discount.isActive)
                        }
                        className="flex items-center gap-1.5"
                      >
                        {discount.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-600">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              Inactive
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/discounts/${discount.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteDiscount(discount.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
