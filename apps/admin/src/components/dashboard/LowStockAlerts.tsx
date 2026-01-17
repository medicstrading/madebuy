'use client'

import { AlertTriangle, ArrowRight, Package, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface StockAlert {
  pieceId: string
  pieceName: string
  variantId?: string
  variantOptions?: Record<string, string>
  sku?: string
  stock: number
  alertType: 'out_of_stock' | 'low_stock'
}

interface AlertsResponse {
  alerts: StockAlert[]
  summary: {
    outOfStock: number
    lowStock: number
    total: number
  }
}

const DISMISSED_KEY = 'madebuy_dismissed_stock_alerts'

export function LowStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [summary, setSummary] = useState({
    outOfStock: 0,
    lowStock: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load dismissed alerts from localStorage
    const saved = localStorage.getItem(DISMISSED_KEY)
    if (saved) {
      try {
        setDismissed(new Set(JSON.parse(saved)))
      } catch {
        // Ignore parse errors
      }
    }

    fetchAlerts()
  }, [fetchAlerts])

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/alerts/stock')
      const data: AlertsResponse = await res.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary || { outOfStock: 0, lowStock: 0, total: 0 })
    } catch (error) {
      console.error('Failed to fetch stock alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  function dismissAlert(alertKey: string) {
    const newDismissed = new Set(dismissed)
    newDismissed.add(alertKey)
    setDismissed(newDismissed)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...newDismissed]))
  }

  function getAlertKey(alert: StockAlert) {
    return `${alert.pieceId}-${alert.variantId || 'main'}`
  }

  function formatVariant(options?: Record<string, string>) {
    if (!options) return null
    return Object.entries(options)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter((a) => !dismissed.has(getAlertKey(a)))
  const outOfStockAlerts = visibleAlerts.filter(
    (a) => a.alertType === 'out_of_stock',
  )
  const lowStockAlerts = visibleAlerts.filter(
    (a) => a.alertType === 'low_stock',
  )

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">
            Stock Alerts
          </h2>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      </section>
    )
  }

  if (visibleAlerts.length === 0) {
    return null // Don't show the section if there are no alerts
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Stock Alerts
          </h2>
          <div className="flex items-center gap-2">
            {summary.outOfStock > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {summary.outOfStock} out of stock
              </span>
            )}
            {summary.lowStock > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                {summary.lowStock} low stock
              </span>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/inventory"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          View inventory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {/* Out of Stock Alerts */}
        {outOfStockAlerts.map((alert) => (
          <div
            key={getAlertKey(alert)}
            className="flex items-center gap-4 px-6 py-3 bg-red-50/50 hover:bg-red-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/inventory/${alert.pieceId}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
              >
                {alert.pieceName}
              </Link>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {alert.variantOptions && (
                  <span className="truncate">
                    {formatVariant(alert.variantOptions)}
                  </span>
                )}
                {alert.sku && <span>SKU: {alert.sku}</span>}
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
              Out of stock
            </span>
            <button
              type="button"
              onClick={() => dismissAlert(getAlertKey(alert))}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Low Stock Alerts */}
        {lowStockAlerts.map((alert) => (
          <div
            key={getAlertKey(alert)}
            className="flex items-center gap-4 px-6 py-3 bg-amber-50/30 hover:bg-amber-50/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/inventory/${alert.pieceId}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
              >
                {alert.pieceName}
              </Link>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {alert.variantOptions && (
                  <span className="truncate">
                    {formatVariant(alert.variantOptions)}
                  </span>
                )}
                {alert.sku && <span>SKU: {alert.sku}</span>}
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
              {alert.stock} left
            </span>
            <button
              type="button"
              onClick={() => dismissAlert(getAlertKey(alert))}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
