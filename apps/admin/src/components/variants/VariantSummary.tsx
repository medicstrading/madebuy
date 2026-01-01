'use client'

import {
  Package,
  AlertTriangle,
  XCircle,
  EyeOff,
  DollarSign,
  TrendingUp,
  Boxes,
} from 'lucide-react'
import type { VariantSummaryProps } from './types'

export function VariantSummary({ stats, className = '' }: VariantSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num)
  }

  if (stats.totalVariants === 0) {
    return null
  }

  // Calculate percentages for the stock status bar
  const stockBreakdown = [
    { type: 'in', count: stats.inStock, color: 'bg-green-500', label: 'In Stock' },
    { type: 'low', count: stats.lowStock, color: 'bg-yellow-500', label: 'Low Stock' },
    { type: 'out', count: stats.outOfStock, color: 'bg-red-500', label: 'Out of Stock' },
    { type: 'unavailable', count: stats.unavailable, color: 'bg-gray-300', label: 'Unavailable' },
  ]

  const stockedCount = stats.inStock + stats.lowStock + stats.outOfStock
  const unlimitedCount =
    stats.totalVariants - stockedCount - stats.unavailable

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total variants */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Boxes className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Variants</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatNumber(stats.totalVariants)}
            </p>
          </div>
        </div>

        {/* Price range */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Price Range</p>
            <p className="text-xl font-semibold text-gray-900">
              {stats.priceRange.min === stats.priceRange.max ? (
                formatCurrency(stats.priceRange.min)
              ) : stats.priceRange.min > 0 || stats.priceRange.max > 0 ? (
                <>
                  {formatCurrency(stats.priceRange.min)} -{' '}
                  {formatCurrency(stats.priceRange.max)}
                </>
              ) : (
                <span className="text-gray-400">No prices set</span>
              )}
            </p>
          </div>
        </div>

        {/* Inventory count */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Inventory</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatNumber(stats.totalInventoryCount)}
              {unlimitedCount > 0 && (
                <span className="ml-1 text-sm font-normal text-gray-500">
                  + {unlimitedCount} unlimited
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Inventory value */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Inventory Value</p>
            <p className="text-xl font-semibold text-gray-900">
              {stats.totalInventoryValue > 0 ? (
                formatCurrency(stats.totalInventoryValue)
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stock status breakdown */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Stock Status</p>
          <div className="flex items-center gap-4 text-xs">
            {stockBreakdown.map(
              (item) =>
                item.count > 0 && (
                  <div key={item.type} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="text-gray-600">
                      {item.label}: {item.count}
                    </span>
                  </div>
                )
            )}
            {unlimitedCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-gray-600">Unlimited: {unlimitedCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
          {stockBreakdown.map((item) => {
            const percentage = (item.count / stats.totalVariants) * 100
            if (percentage === 0) return null
            return (
              <div
                key={item.type}
                className={`${item.color} transition-all duration-300`}
                style={{ width: `${percentage}%` }}
                title={`${item.label}: ${item.count} (${percentage.toFixed(1)}%)`}
              />
            )
          })}
          {unlimitedCount > 0 && (
            <div
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${(unlimitedCount / stats.totalVariants) * 100}%` }}
              title={`Unlimited: ${unlimitedCount}`}
            />
          )}
        </div>

        {/* Warnings */}
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.lowStock > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats.lowStock} low stock
            </div>
          )}
          {stats.outOfStock > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              <XCircle className="h-3.5 w-3.5" />
              {stats.outOfStock} out of stock
            </div>
          )}
          {stats.unavailable > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              <EyeOff className="h-3.5 w-3.5" />
              {stats.unavailable} unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
