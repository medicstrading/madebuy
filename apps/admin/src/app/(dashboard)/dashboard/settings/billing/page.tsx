'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CreditCard, Sparkles, Zap, Crown } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started with the basics',
    features: [
      'Up to 10 products',
      'Basic storefront',
      'Standard support',
      'MadeBuy subdomain',
    ],
    icon: Sparkles,
    color: 'gray',
  },
  {
    id: 'maker',
    name: 'Maker',
    price: 19,
    description: 'For growing makers',
    features: [
      'Unlimited products',
      'Marketplace listing',
      'Social publishing',
      'AI captions',
      'Priority support',
    ],
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    description: 'For established sellers',
    features: [
      'Everything in Maker',
      'Custom domain',
      'Advanced analytics',
      'Multi-channel orders',
      'Accounting integrations',
    ],
    icon: Crown,
    color: 'purple',
  },
  {
    id: 'business',
    name: 'Business',
    price: 79,
    description: 'For serious businesses',
    features: [
      'Everything in Pro',
      'Featured marketplace placement',
      'API access',
      'White-label options',
      'Dedicated support',
    ],
    icon: Crown,
    color: 'amber',
  },
]

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTenant() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const tenant = await response.json()
          setCurrentPlan(tenant.plan || 'free')
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
    // In a real implementation, this would redirect to Stripe Checkout
    alert(`Upgrade to ${planId} plan coming soon! Contact support@madebuy.com.au for early access.`)
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

      {/* Current Plan */}
      <div className="mb-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600">
              You are currently on the{' '}
              <span className="font-semibold capitalize">{currentPlan}</span> plan
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-blue-600" />
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
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Upgrade to {plan.name}
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
