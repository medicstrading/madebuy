'use client'

import type { Tenant } from '@madebuy/shared'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  CreditCard,
  Image as ImageIcon,
  Package,
  Settings,
  Share2,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface GettingStartedChecklistProps {
  tenant: Tenant & { hasProducts?: boolean }
}

interface ChecklistItem {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
  icon: React.ElementType
}

export function GettingStartedChecklist({
  tenant,
}: GettingStartedChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check localStorage for dismissed state
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-checklist-dismissed') === 'true'
    }
    return false
  })

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-checklist-dismissed', 'true')
    }
  }

  const handleRestore = () => {
    setIsDismissed(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding-checklist-dismissed')
    }
  }

  // Build checklist items based on tenant state
  const checklistItems: ChecklistItem[] = [
    {
      id: 'profile',
      title: 'Complete your business profile',
      description: 'Add your business name, description, and logo',
      href: '/dashboard/settings',
      completed: !!(
        tenant.businessName &&
        tenant.description &&
        tenant.logoMediaId
      ),
      icon: Store,
    },
    {
      id: 'product',
      title: 'Add your first product',
      description: 'List a product to start selling',
      href: '/dashboard/inventory/new',
      completed: !!tenant.hasProducts,
      icon: Package,
    },
    {
      id: 'stripe',
      title: 'Connect Stripe for payments',
      description: 'Set up your payment processing',
      href: '/dashboard/connections',
      completed: !!tenant.paymentConfig?.stripe?.connectAccountId,
      icon: CreditCard,
    },
    {
      id: 'shipping',
      title: 'Configure shipping options',
      description: 'Set up how you deliver to customers',
      href: '/dashboard/settings/shipping',
      completed: !!(
        tenant.shippingMethods &&
        tenant.shippingMethods.length > 0 &&
        tenant.shippingMethods.some((m) => m.enabled)
      ),
      icon: Truck,
    },
    {
      id: 'design',
      title: 'Customize your storefront',
      description: 'Make your store look exactly how you want',
      href: '/dashboard/website-design',
      completed: !!(
        tenant.websiteDesign?.template || tenant.primaryColor !== '#3B82F6'
      ),
      icon: Sparkles,
    },
    {
      id: 'share',
      title: 'Share your store link',
      description: 'Get your unique store URL to share with customers',
      href: '/dashboard/settings',
      completed: false, // Always show this as a final step
      icon: Share2,
    },
  ]

  const completedCount = checklistItems.filter((item) => item.completed).length
  const totalCount = checklistItems.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)
  const allCompleted = completedCount === totalCount

  // If dismissed and not all completed, show a restore button
  if (isDismissed) {
    if (allCompleted) return null // Don't show anything if completed and dismissed

    return (
      <button
        type="button"
        onClick={handleRestore}
        className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Getting Started ({completedCount}/{totalCount} complete)
            </p>
            <p className="text-xs text-blue-700">Click to show checklist</p>
          </div>
          <ChevronDown className="h-5 w-5 text-blue-600" />
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Getting Started</h2>
            {allCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Complete!
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {allCompleted
              ? 'Congratulations! Your store is ready to go.'
              : 'Complete these steps to get your store up and running'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 hover:bg-blue-100 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-2 hover:bg-blue-100 transition-colors"
            aria-label="Dismiss checklist"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 tabular-nums min-w-[3rem] text-right">
            {progressPercentage}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {completedCount} of {totalCount} steps completed
        </p>
      </div>

      {/* Checklist items */}
      {isExpanded && (
        <div className="border-t border-blue-100 bg-white/50">
          <div className="p-4 space-y-2">
            {checklistItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    item.completed
                      ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      item.completed
                        ? 'bg-green-100'
                        : 'bg-gray-100 group-hover:bg-blue-100'
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Icon
                        className={`h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        item.completed
                          ? 'text-green-900 line-through'
                          : 'text-gray-900 group-hover:text-blue-900'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p
                      className={`text-xs ${
                        item.completed
                          ? 'text-green-600'
                          : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    >
                      {item.completed ? 'Completed!' : item.description}
                    </p>
                  </div>
                  {!item.completed && (
                    <div className="flex items-center justify-center h-8">
                      <span className="text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
                        Start →
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Help link */}
          <div className="border-t border-blue-100 bg-blue-50/50 p-4">
            <Link
              href="/dashboard/help"
              className="flex items-center justify-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
            >
              <CircleDashed className="h-4 w-4" />
              Need help? Visit our help center
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
