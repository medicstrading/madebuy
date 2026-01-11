'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Link2,
} from 'lucide-react'
import { DnsInstructions } from '@/components/domain/DnsInstructions'
import { DomainStatusBadge } from '@/components/domain/DomainStatusBadge'
import type { DomainStatus } from '@madebuy/shared'

type Step = 'choice' | 'new-domain' | 'existing-domain' | 'verify' | 'complete'

interface DomainData {
  domain: string | null
  status: DomainStatus
  verificationToken: string
  hasCustomDomainFeature: boolean
}

interface TenantData {
  slug: string
  businessName: string
  plan: string
}

export default function DomainOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choice')
  const [domainData, setDomainData] = useState<DomainData | null>(null)
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [domainRes, tenantRes] = await Promise.all([
          fetch('/api/domain'),
          fetch('/api/tenant'),
        ])

        if (domainRes.ok) {
          const data = await domainRes.json()
          setDomainData(data)
          // If domain is already set, skip to appropriate step
          if (data.domain) {
            if (data.status === 'active') {
              setStep('complete')
            } else {
              setStep('verify')
            }
          }
        }

        if (tenantRes.ok) {
          const data = await tenantRes.json()
          setTenant(data)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSetDomain = async () => {
    if (!newDomain.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok) {
        setDomainData(data)
        setStep('verify')
      } else {
        setError(data.error || 'Failed to save domain')
      }
    } catch (err) {
      setError('Failed to save domain')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/domain/verify', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.verified) {
        setStep('complete')
      } else {
        setError(data.message || 'Verification failed. DNS records not found yet.')
      }
    } catch (err) {
      setError('Failed to verify domain')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = async () => {
    // Update onboarding step and continue to location
    try {
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingStep: 'location' }),
      })
      router.push('/dashboard/onboarding/location')
    } catch (err) {
      console.error('Failed to update onboarding step:', err)
      router.push('/dashboard/onboarding/location')
    }
  }

  const handleSkipDomain = async () => {
    // Continue without custom domain to location step
    try {
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingStep: 'location' }),
      })
      router.push('/dashboard/onboarding/location')
    } catch (err) {
      router.push('/dashboard/onboarding/location')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const storefrontUrl = `https://${tenant?.slug}.madebuy.com.au`

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/onboarding')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to setup
      </button>

      {/* Step: Choice */}
      {step === 'choice' && (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Set Up Your Storefront URL
            </h1>
            <p className="text-gray-600">
              Choose how customers will find your store
            </p>
          </div>

          {/* Default URL info */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Your MadeBuy URL</p>
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 hover:underline flex items-center gap-1"
                >
                  {storefrontUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {domainData?.hasCustomDomainFeature ? (
              <>
                <button
                  onClick={() => setStep('new-domain')}
                  className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                    <ShoppingBag className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      I need to buy a domain
                    </h3>
                    <p className="text-sm text-gray-600">
                      We&apos;ll help you register a new domain through Cloudflare
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </button>

                <button
                  onClick={() => setStep('existing-domain')}
                  className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      I already have a domain
                    </h3>
                    <p className="text-sm text-gray-600">
                      Connect your existing domain to your MadeBuy store
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-yellow-800">
                  Custom domains require a <strong>Pro</strong> or higher plan.
                  You can use your MadeBuy URL for now and upgrade later.
                </p>
              </div>
            )}

            <button
              onClick={handleSkipDomain}
              className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                <Link2 className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Use my MadeBuy URL
                </h3>
                <p className="text-sm text-gray-600">
                  Continue with {tenant?.slug}.madebuy.com.au
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Step: New Domain */}
      {step === 'new-domain' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Register a New Domain
            </h1>
            <p className="text-gray-600">
              We recommend using Cloudflare Registrar for the best integration
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 flex-shrink-0">
                <span className="text-xl">☁️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Buy from Cloudflare Registrar
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Cloudflare offers domains at cost with no markup, plus automatic
                  DNS setup and SSL.
                </p>
                <a
                  href="https://dash.cloudflare.com/?to=/:account/domains/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white font-medium hover:bg-orange-600"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Cloudflare Registrar
                </a>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">After purchasing:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Complete the purchase on Cloudflare</li>
                <li>Return here and enter your new domain</li>
                <li>Follow the DNS setup instructions</li>
              </ol>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your purchased domain
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="myshop.com.au"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={handleSetDomain}
                disabled={isSaving || !newDomain.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            onClick={() => setStep('choice')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to options
          </button>
        </div>
      )}

      {/* Step: Existing Domain */}
      {step === 'existing-domain' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connect Your Domain
            </h1>
            <p className="text-gray-600">
              Enter your domain to get DNS setup instructions
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your domain
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="myshop.com.au"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={handleSetDomain}
                disabled={isSaving || !newDomain.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter without http:// or www (e.g., myshop.com.au)
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            onClick={() => setStep('choice')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to options
          </button>
        </div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && domainData?.domain && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Configure DNS Records
              </h1>
              <p className="text-gray-600">
                Add these records at your domain registrar
              </p>
            </div>
            <DomainStatusBadge status={domainData.status} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <DnsInstructions
              domain={domainData.domain}
              verificationToken={domainData.verificationToken}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify DNS Records
            </button>
            <button
              onClick={handleSkipDomain}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Domain Connected!
            </h1>
            <p className="text-gray-600">
              Your custom domain is now active and pointing to your store.
            </p>
          </div>

          {domainData?.domain && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <a
                href={`https://${domainData.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-800 hover:underline font-medium"
              >
                <Globe className="h-5 w-5" />
                {domainData.domain}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
