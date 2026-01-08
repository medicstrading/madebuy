'use client'

import { useEffect, useState } from 'react'
import { Eye, ShoppingCart, CreditCard, CheckCircle, TrendingDown, ArrowRight } from 'lucide-react'

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

interface FunnelChartProps {
  data: FunnelData | null
  isLoading?: boolean
}

const steps = [
  { key: 'viewProduct', label: 'Product Views', icon: Eye, color: 'bg-blue-500' },
  { key: 'addToCart', label: 'Add to Cart', icon: ShoppingCart, color: 'bg-purple-500' },
  { key: 'startCheckout', label: 'Start Checkout', icon: CreditCard, color: 'bg-amber-500' },
  { key: 'completePurchase', label: 'Purchase', icon: CheckCircle, color: 'bg-emerald-500' },
] as const

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm mt-1">Analytics will appear as customers interact with your store</p>
      </div>
    )
  }

  const maxValue = Math.max(data.viewProduct, 1)

  const rates = [
    null, // No rate for first step
    data.viewToCartRate,
    data.cartToCheckoutRate,
    data.checkoutToPurchaseRate,
  ]

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const value = data[step.key]
        const percentage = (value / maxValue) * 100
        const Icon = step.icon
        const rate = rates[index]

        return (
          <div key={step.key}>
            {/* Conversion rate arrow between steps */}
            {index > 0 && rate !== null && (
              <div className="flex items-center justify-center py-1 text-xs text-gray-500">
                <ArrowRight className="h-3 w-3 mr-1" />
                <span className={rate >= 50 ? 'text-emerald-600 font-medium' : rate >= 20 ? 'text-amber-600' : 'text-red-500'}>
                  {rate}% conversion
                </span>
              </div>
            )}

            <div className="relative">
              {/* Bar background */}
              <div className="h-16 bg-gray-100 rounded-lg overflow-hidden">
                {/* Filled bar */}
                <div
                  className={`h-full ${step.color} transition-all duration-500 ease-out`}
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
              </div>

              {/* Label overlay */}
              <div className="absolute inset-0 flex items-center px-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.color} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                  <p className="text-xs text-gray-600">{value.toLocaleString()} events</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Overall conversion summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Overall Conversion Rate</p>
            <p className="text-xs text-gray-400 mt-0.5">Product View to Purchase</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${
              data.overallConversionRate >= 3 ? 'text-emerald-600' :
              data.overallConversionRate >= 1 ? 'text-amber-600' : 'text-gray-900'
            }`}>
              {data.overallConversionRate}%
            </p>
            <p className="text-xs text-gray-400">
              {data.completePurchase} of {data.viewProduct} converted
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FunnelChartCompact({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex gap-1 h-20">
          {[100, 60, 30, 15].map((w, i) => (
            <div key={i} className="bg-gray-200 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.viewProduct === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-sm">No funnel data yet</p>
      </div>
    )
  }

  const maxValue = Math.max(data.viewProduct, 1)

  return (
    <div className="space-y-4">
      {/* Compact bar visualization */}
      <div className="flex items-end gap-2 h-24">
        {steps.map((step, index) => {
          const value = data[step.key]
          const percentage = (value / maxValue) * 100
          const Icon = step.icon

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full ${step.color} rounded-t transition-all duration-500`}
                style={{ height: `${Math.max(percentage, 5)}%` }}
              />
              <Icon className="h-4 w-4 mt-2 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 mt-1">{value}</span>
            </div>
          )
        })}
      </div>

      {/* Overall rate */}
      <div className="text-center">
        <span className="text-sm text-gray-500">Conversion: </span>
        <span className="text-sm font-semibold text-gray-900">{data.overallConversionRate}%</span>
      </div>
    </div>
  )
}
