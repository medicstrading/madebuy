'use client'

import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface FeatureGateProps {
  feature: string
  requiredPlan: 'maker' | 'pro' | 'business'
  currentPlan?: string
  children: React.ReactNode
  showTeaser?: boolean
  teaserTitle?: string
  teaserDescription?: string
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  maker: 'Maker',
  pro: 'Professional',
  business: 'Business',
}

const PLAN_PRICES: Record<string, number> = {
  maker: 19,
  pro: 39,
  business: 79,
}

const PLAN_ORDER = ['free', 'maker', 'pro', 'business']

export function FeatureGate({
  feature,
  requiredPlan,
  currentPlan = 'free',
  children,
  showTeaser = true,
  teaserTitle,
  teaserDescription,
}: FeatureGateProps) {
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan)
  const requiredPlanIndex = PLAN_ORDER.indexOf(requiredPlan)
  const hasAccess = currentPlanIndex >= requiredPlanIndex

  if (hasAccess) {
    return <>{children}</>
  }

  if (!showTeaser) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
      {/* Lock badge */}
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
        <Lock className="h-3 w-3" />
        {PLAN_NAMES[requiredPlan]} Plan
      </div>

      {/* Content */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
          <Sparkles className="h-7 w-7 text-purple-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900">
          {teaserTitle || `Unlock ${feature}`}
        </h3>

        <p className="mt-2 max-w-sm text-sm text-gray-600">
          {teaserDescription || `This feature is available on the ${PLAN_NAMES[requiredPlan]} plan and above.`}
        </p>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">
            ${PLAN_PRICES[requiredPlan]}
          </span>
          <span className="text-gray-500">/month</span>
        </div>

        <Link
          href="/dashboard/settings/billing"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-md"
        >
          Upgrade to {PLAN_NAMES[requiredPlan]}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// Simple inline lock indicator for checkboxes/toggles
export function FeatureLockBadge({ requiredPlan }: { requiredPlan: string }) {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Lock className="h-3 w-3" />
      {PLAN_NAMES[requiredPlan] || requiredPlan}
    </span>
  )
}
