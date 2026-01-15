'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Calendar, TrendingUp, Package, RefreshCw, Globe } from 'lucide-react'
import { FunnelChart } from '@/components/analytics/FunnelChart'
import { TrafficSourceChart, type SourceStats } from '@/components/analytics/TrafficSourceChart'

interface FunnelData {
  viewProduct: number
  addToCart: number
  startCheckout: number
  completePurchase: number
  viewToCartRate: number
  cartToCheckoutRate: number
  checkoutToPurchaseRate: number
  overallConversionRate: number
}

interface TopProduct {
  productId: string
  views: number
  purchases: number
  conversionRate: number
}

interface AnalyticsData {
  funnel: FunnelData
  topProducts: TopProduct[]
  dateRange: {
    start: string
    end: string
  }
}

interface SourceData {
  sources: SourceStats[]
  totalViews: number
  uniqueVisitors: number
}

type DatePreset = '7d' | '30d' | '90d' | 'custom'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [sourceData, setSourceData] = useState<SourceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let startDate: Date
      const endDate = new Date()

      switch (datePreset) {
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          if (!customStart || !customEnd) {
            setIsLoading(false)
            return
          }
          startDate = new Date(customStart)
          break
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: datePreset === 'custom' ? new Date(customEnd).toISOString() : endDate.toISOString(),
      })

      // Fetch funnel and source data in parallel
      const [funnelRes, sourceRes] = await Promise.all([
        fetch(`/api/analytics/funnel?${params}`),
        fetch(`/api/analytics/sources?${params}`),
      ])

      if (!funnelRes.ok) throw new Error('Failed to fetch analytics')

      const funnelJson = await funnelRes.json()
      setData(funnelJson)

      // Source data is optional - don't fail if it errors
      if (sourceRes.ok) {
        const sourceJson = await sourceRes.json()
        setSourceData(sourceJson)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [datePreset, customStart, customEnd])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track your store&apos;s conversion funnel</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Date Range:</span>
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', '90d'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  datePreset === preset
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {preset === '7d' ? 'Last 7 days' : preset === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                datePreset === 'custom'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Custom
            </button>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-4">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Two Column Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Conversion Funnel</h2>
          </div>
          <div className="p-6">
            <FunnelChart data={data?.funnel || null} isLoading={isLoading} />
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Traffic Sources</h2>
          </div>
          <div className="p-6">
            <TrafficSourceChart data={sourceData?.sources || null} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Top Products by Conversion */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <TrendingUp className="h-5 w-5 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">Top Products by Conversion</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : data?.topProducts && data.topProducts.length > 0 ? (
            data.topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 font-semibold">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Product {product.productId.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.views} views, {product.purchases} purchases
                  </p>
                </div>
                <div className={`text-lg font-bold ${
                  product.conversionRate >= 5 ? 'text-emerald-600' :
                  product.conversionRate >= 2 ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {product.conversionRate}%
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No product data yet</p>
              <p className="text-xs text-gray-400 mt-1">Product conversion data will appear as customers interact with your store</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">How the funnel works</p>
            <p className="text-sm text-blue-700 mt-1">
              The conversion funnel tracks customer journey from viewing a product, adding to cart,
              starting checkout, and completing a purchase. A healthy e-commerce conversion rate is
              typically 1-3% from view to purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
