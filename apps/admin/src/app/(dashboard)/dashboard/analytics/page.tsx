'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  ShoppingCart,
  Copy,
  ExternalLink,
  Instagram,
  Facebook,
  Check,
  Loader2,
} from 'lucide-react'
import type { SourceAnalyticsSummary } from '@madebuy/shared'

interface TrackedLinksData {
  storefront: string
  links: {
    instagram_bio: string
    facebook_page: string
    tiktok_bio: string
    email_footer: string
    linktree: string
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SourceAnalyticsSummary | null>(null)
  const [trackedLinks, setTrackedLinks] = useState<TrackedLinksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [analyticsRes, linksRes] = await Promise.all([
          fetch(`/api/analytics/sources?period=${period}`),
          fetch('/api/tracked-links'),
        ])

        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          setAnalytics(data)
        }

        if (linksRes.ok) {
          const data = await linksRes.json()
          setTrackedLinks(data)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        setError('Failed to load analytics data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={() => setPeriod(period)}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Traffic Analytics</h1>
          <p className="mt-2 text-gray-600">
            See where your visitors come from and track conversions
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Views"
          value={analytics?.totalViews || 0}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Unique Visitors"
          value={analytics?.uniqueVisitors || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Enquiries"
          value={analytics?.enquiries || 0}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={`${(analytics?.conversionRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Sources */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
          {!analytics?.sources?.length ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No traffic data yet</p>
              <p className="text-sm mt-1">Share your tracked links to start seeing data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.sources.map((source) => (
                <SourceRow key={source.source} source={source} />
              ))}
            </div>
          )}
        </div>

        {/* Tracked Links */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Tracked Links</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use these links to track where your traffic comes from
          </p>

          {trackedLinks && (
            <div className="space-y-3">
              <TrackedLinkRow
                label="Instagram Bio"
                url={trackedLinks.links.instagram_bio}
                icon={<Instagram className="h-4 w-4" />}
              />
              <TrackedLinkRow
                label="Facebook Page"
                url={trackedLinks.links.facebook_page}
                icon={<Facebook className="h-4 w-4" />}
              />
              <TrackedLinkRow
                label="TikTok Bio"
                url={trackedLinks.links.tiktok_bio}
                icon={<span className="text-xs font-bold">TT</span>}
              />
              <TrackedLinkRow
                label="Email Footer"
                url={trackedLinks.links.email_footer}
                icon={<span className="text-xs">@</span>}
              />
              <TrackedLinkRow
                label="Linktree"
                url={trackedLinks.links.linktree}
                icon={<ExternalLink className="h-4 w-4" />}
              />
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Views
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Enquiries
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.topProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {product.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {product.enquiries}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {product.views > 0
                        ? `${((product.enquiries / product.views) * 100).toFixed(1)}%`
                        : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number | string
  icon: any
  color: 'yellow' | 'blue' | 'purple' | 'green'
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function SourceRow({
  source,
}: {
  source: {
    source: string
    views: number
    enquiries: number
    conversionRate: number
  }
}) {
  const sourceLabels: Record<string, string> = {
    instagram: 'Instagram',
    instagram_bio: 'Instagram Bio',
    instagram_organic: 'Instagram (Organic)',
    facebook: 'Facebook',
    facebook_page: 'Facebook Page',
    facebook_organic: 'Facebook (Organic)',
    marketplace: 'Marketplace',
    google: 'Google',
    direct: 'Direct',
    email: 'Email',
    linktree: 'Linktree',
    tiktok: 'TikTok',
    tiktok_bio: 'TikTok Bio',
    pinterest: 'Pinterest',
    pinterest_organic: 'Pinterest (Organic)',
    referral_other: 'Other Referrals',
  }

  const label = sourceLabels[source.source] || source.source

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <SourceIcon source={source.source} />
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <span className="text-gray-900 font-medium">{source.views.toLocaleString()}</span>
          <span className="text-gray-500 ml-1">views</span>
        </div>
        <div className="text-right">
          <span className="text-gray-900 font-medium">{source.enquiries}</span>
          <span className="text-gray-500 ml-1">enquiries</span>
        </div>
        <div className="w-16 text-right">
          <span className={`font-medium ${source.conversionRate > 3 ? 'text-green-600' : 'text-gray-600'}`}>
            {source.conversionRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function SourceIcon({ source }: { source: string }) {
  const iconClasses = 'h-8 w-8 rounded-full flex items-center justify-center'

  if (source.includes('instagram')) {
    return (
      <div className={`${iconClasses} bg-gradient-to-br from-purple-500 to-pink-500 text-white`}>
        <Instagram className="h-4 w-4" />
      </div>
    )
  }
  if (source.includes('facebook')) {
    return (
      <div className={`${iconClasses} bg-blue-600 text-white`}>
        <Facebook className="h-4 w-4" />
      </div>
    )
  }
  if (source.includes('tiktok')) {
    return (
      <div className={`${iconClasses} bg-black text-white`}>
        <span className="text-xs font-bold">TT</span>
      </div>
    )
  }
  if (source === 'marketplace') {
    return (
      <div className={`${iconClasses} bg-orange-500 text-white`}>
        <ShoppingCart className="h-4 w-4" />
      </div>
    )
  }
  if (source === 'google') {
    return (
      <div className={`${iconClasses} bg-red-500 text-white`}>
        <span className="text-xs font-bold">G</span>
      </div>
    )
  }

  return (
    <div className={`${iconClasses} bg-gray-200 text-gray-600`}>
      <ExternalLink className="h-4 w-4" />
    </div>
  )
}

function TrackedLinkRow({
  label,
  url,
  icon,
}: {
  label: string
  url: string
  icon: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 truncate">{url}</p>
      </div>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          copied
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}
