'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, CreditCard, Sparkles, Zap, Crown, ExternalLink, Loader2 } from 'lucide-react'

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
    color: 'gray',
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
    color: 'blue',
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
    color: 'purple',
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
      'Unlimited social platforms',
      'Unlimited AI captions',
      'API access',
      '3 team members',
    ],
    icon: Crown,
    color: 'amber',
  },
]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Check for success/cancel params
    if (searchParams?.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription updated successfully!' })
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

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to start upgrade process',
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

      // Redirect to Stripe Portal
      window.location.href = data.url
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to open billing portal',
      })
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="mt-2 text-gray-600">Manage your subscription and billing settings</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Plan */}
      <div className="mb-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600">
              You are currently on the{' '}
              <span className="font-semibold capitalize">
                {PLANS.find(p => p.id === currentPlan)?.name || currentPlan}
              </span> plan
            </p>
          </div>
          <div className="flex items-center gap-4">
            {hasSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={upgrading === 'portal'}
                className="flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                {upgrading === 'portal' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage Subscription
              </button>
            )}
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrentPlan = plan.id === currentPlan
          const canUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan)

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 bg-white p-6 shadow-sm transition-all ${
                isCurrentPlan
                  ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2'
                  : plan.popular
                  ? 'border-purple-300'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 bg-${plan.color}-100`}>
                  <Icon className={`h-5 w-5 text-${plan.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>

              <p className="mb-6 text-sm text-gray-600">{plan.description}</p>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : canUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading !== null}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
                  disabled
                  className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                >
                  Included in your plan
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="mt-8 rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          Need help choosing a plan?{' '}
          <a href="mailto:support@madebuy.com.au" className="text-blue-600 hover:underline">
            Contact our team
          </a>{' '}
          for personalized recommendations.
        </p>
      </div>
    </div>
  )
}
