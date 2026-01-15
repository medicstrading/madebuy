'use client'

import { Globe, Instagram, Facebook, Search, Link2, Mail, ShoppingBag, Compass } from 'lucide-react'

export interface SourceStats {
  source: string
  views: number
  enquiries: number
  purchases: number
  conversionRate: number
  purchaseRate: number
}

interface TrafficSourceChartProps {
  data: SourceStats[] | null
  isLoading?: boolean
}

// Source configuration with colors and icons
const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string; bgColor: string }> = {
  instagram_organic: {
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-pink-500 to-purple-500',
    bgColor: 'bg-pink-50',
  },
  instagram_bio: {
    label: 'Instagram Bio',
    icon: Instagram,
    color: 'bg-gradient-to-r from-pink-500 to-purple-500',
    bgColor: 'bg-pink-50',
  },
  facebook_organic: {
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    bgColor: 'bg-blue-50',
  },
  facebook_page: {
    label: 'Facebook Page',
    icon: Facebook,
    color: 'bg-blue-600',
    bgColor: 'bg-blue-50',
  },
  google: {
    label: 'Google Search',
    icon: Search,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
  },
  direct: {
    label: 'Direct',
    icon: Globe,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
  },
  marketplace: {
    label: 'Marketplace',
    icon: ShoppingBag,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  linktree: {
    label: 'Linktree',
    icon: Link2,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
  },
  referral_other: {
    label: 'Other Referral',
    icon: Compass,
    color: 'bg-slate-500',
    bgColor: 'bg-slate-50',
  },
}

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source] || {
    label: source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: Globe,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
  }
}

export function TrafficSourceChart({ data, isLoading }: TrafficSourceChartProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No traffic data yet</p>
        <p className="text-sm mt-1">Source attribution will appear as visitors come to your store</p>
      </div>
    )
  }

  const maxViews = Math.max(...data.map(s => s.views), 1)
  const totalViews = data.reduce((sum, s) => sum + s.views, 0)

  return (
    <div className="space-y-3">
      {data.map((source) => {
        const config = getSourceConfig(source.source)
        const Icon = config.icon
        const percentage = (source.views / maxViews) * 100
        const shareOfTotal = totalViews > 0 ? ((source.views / totalViews) * 100).toFixed(1) : '0'

        return (
          <div key={source.source} className="relative">
            {/* Bar background */}
            <div className="h-14 bg-gray-100 rounded-lg overflow-hidden">
              {/* Filled bar */}
              <div
                className={`h-full ${config.color} transition-all duration-500 ease-out opacity-90`}
                style={{ width: `${Math.max(percentage, 3)}%` }}
              />
            </div>

            {/* Label overlay */}
            <div className="absolute inset-0 flex items-center px-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bgColor} shadow-sm`}>
                <Icon className="h-4 w-4 text-gray-700" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{config.label}</p>
                <p className="text-xs text-gray-600">
                  {source.views.toLocaleString()} views · {shareOfTotal}% of traffic
                </p>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-bold ${
                  source.purchaseRate >= 3 ? 'text-emerald-600' :
                  source.purchaseRate >= 1 ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {source.purchaseRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">conversion</p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Views</span>
          <span className="font-semibold text-gray-900">{totalViews.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-500">Traffic Sources</span>
          <span className="font-semibold text-gray-900">{data.length}</span>
        </div>
      </div>
    </div>
  )
}
