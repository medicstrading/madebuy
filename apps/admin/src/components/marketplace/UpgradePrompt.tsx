import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import type { Tenant } from '@madebuy/shared'
import { getMarketplaceUpgradeMessage } from '@/lib/marketplace'

interface UpgradePromptProps {
  tenant: Tenant
  feature: 'marketplace' | 'featured'
  compact?: boolean
}

export function UpgradePrompt({ tenant, feature, compact = false }: UpgradePromptProps) {
  const message = getMarketplaceUpgradeMessage(tenant)

  if (compact) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-gray-900">{message.title}</h3>
            <p className="mb-3 text-sm text-gray-700">{message.description}</p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {message.ctaText}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  // Full upgrade prompt with features
  const features =
    feature === 'marketplace'
      ? [
          'List unlimited products in the marketplace',
          'Reach thousands of active buyers',
          'No transaction fees, ever',
          'Detailed marketplace analytics',
          'Customer reviews and ratings',
        ]
      : [
          'Homepage hero placements',
          'Category featured listings',
          'Search sponsored results',
          'Performance analytics',
          'Priority support',
        ]

  return (
    <div className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{message.title}</h2>
        <p className="text-gray-700">{message.description}</p>
        {message.price && (
          <div className="mt-2 text-sm text-gray-600">
            Current plan: <span className="font-semibold">{tenant.plan}</span>
          </div>
        )}
      </div>

      <div className="mb-6 space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-3 w-3" />
            </div>
            <p className="text-gray-700">{feature}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
        >
          {message.ctaText}
          {message.price && <span className="ml-1">- {message.price}</span>}
          <ArrowUpRight className="h-5 w-5" />
        </Link>
        <Link href="/pricing" className="text-blue-600 hover:text-blue-700 hover:underline">
          Compare Plans
        </Link>
      </div>

      {feature === 'marketplace' && (
        <div className="mt-6 border-t border-blue-200 pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">1,000+</div>
              <div className="text-sm text-gray-600">Products Listed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">200+</div>
              <div className="text-sm text-gray-600">Active Makers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">0%</div>
              <div className="text-sm text-gray-600">Transaction Fees</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
