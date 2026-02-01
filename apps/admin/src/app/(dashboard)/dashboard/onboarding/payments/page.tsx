'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface StripeConnectionStatus {
  connected: boolean
  connectAccountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

export default function PaymentsOnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stripeStatus, setStripeStatus] =
    useState<StripeConnectionStatus | null>(null)

  useEffect(() => {
    async function loadStripeStatus() {
      try {
        const res = await fetch('/api/stripe/connect')
        if (res.ok) {
          const data = await res.json()
          setStripeStatus(data)
        }
      } catch (error) {
        console.error('Failed to load Stripe status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadStripeStatus()
  }, [])

  const handleContinue = async () => {
    try {
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingComplete: true,
          onboardingStep: 'complete',
        }),
      })
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    }
  }

  const handleSkip = async () => {
    if (
      confirm(
        "Skip payment setup? You won't be able to receive payments from customers until you connect Stripe.",
      )
    ) {
      await handleContinue()
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const isConnected = stripeStatus?.connected

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/onboarding')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to setup
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <CreditCard className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Set Up Payments
        </h1>
        <p className="text-lg text-gray-600">
          Connect your bank account to receive payments from customers
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden mb-6">
        {isConnected ? (
          // Connected State
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Setup Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Your Stripe account is connected and ready to receive payments.
            </p>

            {/* Capabilities Status */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
              <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                {stripeStatus.chargesEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    Accept Payments
                  </p>
                  <p className="text-xs text-gray-500">
                    {stripeStatus.chargesEnabled ? 'Enabled' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                {stripeStatus.payoutsEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    Receive Payouts
                  </p>
                  <p className="text-xs text-gray-500">
                    {stripeStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/connections"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Manage payment settings →
            </Link>
          </div>
        ) : (
          // Not Connected State
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Why connect Stripe?
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Accept credit and debit card payments securely</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Receive payouts directly to your bank account</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Zero platform fees - MadeBuy takes 0% of your sales
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Low Stripe fees: 1.7% + $0.30 for Australian cards
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-6">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Payment setup required</p>
                  <p>
                    Without connecting Stripe, customers will not be able to
                    purchase from your store.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/connections"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              <CreditCard className="h-5 w-5" />
              Connect with Stripe
            </Link>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        {!isConnected && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          {isConnected ? 'Complete Setup' : "I'll do this later"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
