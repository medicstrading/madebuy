'use client'

import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  CreditCard,
  Eye,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface FunnelData {
  viewProduct: number
  addToCart: number
  startCheckout: number
  completePurchase: number
  overallConversionRate: number
}

interface AnalyticsWidgetProps {
  initialData?: FunnelData
}

export function AnalyticsWidget({ initialData }: AnalyticsWidgetProps) {
  const [data, setData] = useState<FunnelData | null>(initialData ?? null)
  const [isLoading, setIsLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) return // Skip fetch if we have initial data

    async function fetchData() {
      try {
        const res = await fetch('/api/analytics/funnel')
        if (res.ok) {
          const json = await res.json()
          setData(json.funnel)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [initialData])

  const maxValue = data ? Math.max(data.viewProduct, 1) : 1

  const steps = [
    { key: 'viewProduct', icon: Eye, color: 'bg-blue-500', label: 'Views' },
    {
      key: 'addToCart',
      icon: ShoppingCart,
      color: 'bg-purple-500',
      label: 'Cart',
    },
    {
      key: 'startCheckout',
      icon: CreditCard,
      color: 'bg-amber-500',
      label: 'Checkout',
    },
    {
      key: 'completePurchase',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      label: 'Purchase',
    },
  ] as const

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Conversion Funnel
          </h2>
        </div>
        <Link
          href="/dashboard/analytics"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="flex items-end gap-3 h-24">
              {[100, 60, 30, 15].map((w, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gray-200 rounded"
                  style={{ height: `${w}%` }}
                />
              ))}
            </div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
          </div>
        ) : data && data.viewProduct > 0 ? (
          <>
            {/* Mini funnel visualization */}
            <div className="flex items-end gap-3 h-24 mb-4">
              {steps.map((step) => {
                const value = data[step.key]
                const percentage = (value / maxValue) * 100
                const Icon = step.icon

                return (
                  <div
                    key={step.key}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className={`w-full ${step.color} rounded-t transition-all duration-500`}
                      style={{ height: `${Math.max(percentage, 5)}%` }}
                    />
                    <div className="mt-2 text-center">
                      <Icon className="h-4 w-4 mx-auto text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 block mt-1">
                        {value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Conversion rate */}
            <div className="text-center pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Overall Conversion:{' '}
              </span>
              <span
                className={`text-lg font-bold ${
                  data.overallConversionRate >= 3
                    ? 'text-emerald-600'
                    : data.overallConversionRate >= 1
                      ? 'text-amber-600'
                      : 'text-gray-900'
                }`}
              >
                {data.overallConversionRate}%
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">
              No funnel data yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Data will appear as customers interact with your store
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
