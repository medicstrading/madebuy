'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Building2,
  User,
  RefreshCw,
} from 'lucide-react'

type ConnectStatus = {
  hasAccount: boolean
  accountId?: string
  status: 'pending' | 'active' | 'restricted' | 'disabled' | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  isActive: boolean
  requirements?: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
    disabled_reason?: string
  }
}

export default function PaymentsSettingsPage() {
  const searchParams = useSearchParams()
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for onboarding completion
  const onboardingComplete = searchParams.get('onboarding') === 'complete'
  const needsRefresh = searchParams.get('refresh') === 'true'

  // Load Connect status
  const loadStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect')
      if (response.ok) {
        const data = await response.json()
        setConnectStatus(data)
      } else {
        setError('Failed to load payment settings')
      }
    } catch (err) {
      setError('Failed to load payment settings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // Create Connect account
  const handleCreateAccount = async (businessType: 'individual' | 'company') => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType }),
      })
      if (response.ok) {
        await loadStatus()
        // Automatically start onboarding
        handleStartOnboarding()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create account')
      }
    } catch (err) {
      setError('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  // Start or continue onboarding
  const handleStartOnboarding = async () => {
    setIsRedirecting(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/connect/onboarding', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to start onboarding')
        setIsRedirecting(false)
      }
    } catch (err) {
      setError('Failed to start onboarding')
      setIsRedirecting(false)
    }
  }

  // Open Express dashboard
  const handleOpenDashboard = async () => {
    setIsRedirecting(true)
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        window.open(data.url, '_blank')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to open dashboard')
      }
    } catch (err) {
      setError('Failed to open dashboard')
    } finally {
      setIsRedirecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
        <p className="mt-1 text-gray-500">
          Set up payments to receive funds from your sales
        </p>
      </div>

      {/* Success message */}
      {onboardingComplete && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800">
              Onboarding step completed! We&apos;re verifying your details.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Stripe Connect Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stripe Connect</h2>
              <p className="text-sm text-gray-500">
                Connect your Stripe account to receive payouts
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!connectStatus?.hasAccount ? (
            // No account - show setup options
            <div className="space-y-6">
              <p className="text-gray-600">
                To receive payments from customers, you need to connect a Stripe account.
                Stripe handles all payment processing securely.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => handleCreateAccount('individual')}
                  disabled={isCreating}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <User className="h-8 w-8 text-gray-600" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Individual / Sole Trader</p>
                    <p className="text-sm text-gray-500">For solo makers and craftspeople</p>
                  </div>
                </button>

                <button
                  onClick={() => handleCreateAccount('company')}
                  disabled={isCreating}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <Building2 className="h-8 w-8 text-gray-600" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Company / Business</p>
                    <p className="text-sm text-gray-500">For registered businesses</p>
                  </div>
                </button>
              </div>

              {isCreating && (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Setting up your account...</span>
                </div>
              )}
            </div>
          ) : (
            // Has account - show status
            <div className="space-y-6">
              {/* Status indicator */}
              <div className="flex items-center gap-4">
                <StatusBadge status={connectStatus.status} />
                <button
                  onClick={loadStatus}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {/* Capabilities */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                  {connectStatus.chargesEnabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Accept Payments</p>
                    <p className="text-sm text-gray-500">
                      {connectStatus.chargesEnabled ? 'Enabled' : 'Pending verification'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                  {connectStatus.payoutsEnabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Receive Payouts</p>
                    <p className="text-sm text-gray-500">
                      {connectStatus.payoutsEnabled ? 'Enabled' : 'Pending verification'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="font-medium text-yellow-800 mb-2">Action Required</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    Complete the following to enable payments:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {connectStatus.requirements.currently_due.slice(0, 5).map((req) => (
                      <li key={req}>{formatRequirement(req)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {!connectStatus.onboardingComplete && (
                  <button
                    onClick={handleStartOnboarding}
                    disabled={isRedirecting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isRedirecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Continue Setup
                  </button>
                )}

                {connectStatus.onboardingComplete && (
                  <button
                    onClick={handleOpenDashboard}
                    disabled={isRedirecting}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isRedirecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Open Stripe Dashboard
                  </button>
                )}

                {connectStatus.requirements?.currently_due && connectStatus.requirements.currently_due.length > 0 && connectStatus.onboardingComplete && (
                  <button
                    onClick={handleStartOnboarding}
                    disabled={isRedirecting}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Update Information
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">About Payments</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• MadeBuy charges 0% platform fees - you keep more of your earnings</li>
          <li>• Stripe processing fees: 1.7% + $0.30 for Australian cards</li>
          <li>• Payouts are sent to your bank within 2-3 business days</li>
          <li>• Stripe handles all payment security and compliance</li>
        </ul>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const styles = {
    active: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    restricted: 'bg-orange-100 text-orange-800 border-orange-200',
    disabled: 'bg-red-100 text-red-800 border-red-200',
  }

  const labels = {
    active: 'Active',
    pending: 'Pending Verification',
    restricted: 'Restricted',
    disabled: 'Disabled',
  }

  const style = styles[status as keyof typeof styles] || styles.pending
  const label = labels[status as keyof typeof labels] || 'Unknown'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${style}`}>
      {label}
    </span>
  )
}

function formatRequirement(requirement: string): string {
  const mappings: Record<string, string> = {
    'external_account': 'Bank account for payouts',
    'individual.dob': 'Date of birth',
    'individual.address': 'Address',
    'individual.first_name': 'First name',
    'individual.last_name': 'Last name',
    'individual.email': 'Email address',
    'individual.phone': 'Phone number',
    'individual.id_number': 'Tax file number (TFN)',
    'business_profile.url': 'Business website',
    'business_profile.mcc': 'Business category',
    'tos_acceptance': 'Accept terms of service',
  }
  return mappings[requirement] || requirement.replace(/_/g, ' ').replace(/\./g, ' - ')
}
