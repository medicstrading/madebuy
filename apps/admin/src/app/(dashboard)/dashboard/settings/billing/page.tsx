'use client'

import {
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    yearlyPrice: 0,
    description: 'Try before you buy',
    features: [
      '5 products',
      '3 images per product',
      '50 MB storage',
      '10 orders/month',
    ],
    icon: Sparkles,
    gradient: 'from-gray-100 to-slate-100',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
  },
  {
    id: 'maker',
    name: 'Maker',
    price: 15,
    yearlyPrice: 150,
    description: 'For serious hobbyists',
    features: [
      '50 products',
      '8 images per product',
      '500 MB storage',
      'Custom domain',
      '1 social platform',
      '20 AI captions/month',
    ],
    icon: Zap,
    gradient: 'from-blue-50 to-indigo-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    popular: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    yearlyPrice: 290,
    description: 'For full-time makers',
    features: [
      '200 products',
      '15 images per product',
      '2 GB storage',
      '3 social platforms',
      '100 AI captions/month',
      'Advanced analytics',
      'Priority support',
    ],
    icon: Crown,
    gradient: 'from-purple-50 to-violet-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 59,
    yearlyPrice: 590,
    description: 'For established brands',
    features: [
      'Unlimited products',
      '30 images per product',
      '10 GB storage',
      'Unlimited platforms',
      'Unlimited AI captions',
      'API access',
      '3 team members',
    ],
    icon: Crown,
    gradient: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      setMessage({
        type: 'success',
        text: 'Subscription updated successfully!',
      })
    } else if (searchParams?.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Subscription update was cancelled.' })
    }
  }, [searchParams])

  useEffect(() => {
    async function loadTenant() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const tenant = await response.json()
          setCurrentPlan(tenant.plan || 'free')
          setHasSubscription(!!tenant.subscriptionId)
        }
      } catch (err) {
        console.error('Failed to load tenant:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTenant()
  }, [])

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId)
    setMessage(null)

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Failed to start upgrade process',
      })
      setUpgrading(null)
    }
  }

  const handleManageSubscription = async () => {
    setUpgrading('portal')
    setMessage(null)

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Failed to open billing portal',
      })
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const currentPlanData = PLANS.find((p) => p.id === currentPlan)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Billing & Plans
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <p
            className={
              message.type === 'success' ? 'text-emerald-800' : 'text-red-800'
            }
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Current Plan</p>
              <p className="text-xl font-semibold text-gray-900">
                {currentPlanData?.name || 'Starter'}
              </p>
            </div>
          </div>
          {hasSubscription && (
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={upgrading === 'portal'}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {upgrading === 'portal' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid - Responsive */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrentPlan = plan.id === currentPlan
          const canUpgrade =
            PLANS.findIndex((p) => p.id === plan.id) >
            PLANS.findIndex((p) => p.id === currentPlan)

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 bg-gradient-to-br ${plan.gradient} p-5 transition-all duration-200 ${
                isCurrentPlan
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                  : plan.popular && !isCurrentPlan
                    ? 'border-purple-300 hover:border-purple-400 hover:shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Badge */}
              {plan.popular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-3">
                <span className="text-3xl font-bold text-gray-900">
                  ${plan.price}
                </span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>

              <p className="mb-5 text-sm text-gray-600">{plan.description}</p>

              {/* Features */}
              <ul className="mb-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {isCurrentPlan ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : canUpgrade ? (
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading !== null}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {upgrading === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                >
                  Included
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm text-gray-600">
          Need help choosing a plan?{' '}
          <a
            href="mailto:support@madebuy.com.au"
            className="text-blue-600 hover:underline font-medium"
          >
            Contact our team
          </a>{' '}
          for personalized recommendations.
        </p>
      </div>
    </div>
  )
}
