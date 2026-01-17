'use client'

import type { OnboardingStep } from '@madebuy/shared'
import { CheckCircle2, Loader2, MapPin, Palette } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface TenantData {
  onboardingComplete?: boolean
  onboardingStep?: OnboardingStep
  businessName: string
  domainStatus: string
}

const STEPS = [
  {
    id: 'location',
    title: 'Select Your Location',
    description: 'Set your currency, timezone, and regional settings',
    icon: MapPin,
    href: '/dashboard/onboarding/location',
  },
  {
    id: 'design',
    title: 'Design Your Website',
    description: 'Choose your look and customize your storefront',
    icon: Palette,
    href: '/dashboard/onboarding/design',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTenant() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)

          // If onboarding is complete, redirect to dashboard
          if (data.onboardingComplete) {
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Failed to load tenant:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTenant()
  }, [router])

  const handleSkip = async () => {
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
      console.error('Failed to skip onboarding:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentStepIndex = STEPS.findIndex(
    (s) => s.id === tenant?.onboardingStep,
  )

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to MadeBuy!
        </h1>
        <p className="text-lg text-gray-600">
          Let&apos;s get your store set up in just a few steps.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                index < currentStepIndex
                  ? 'border-green-500 bg-green-500 text-white'
                  : index === currentStepIndex
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
              }`}
            >
              {index < currentStepIndex ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-1 w-16 mx-2 ${
                  index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Steps list */}
      <div className="space-y-4 mb-8">
        {STEPS.map((step, index) => {
          const isComplete = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const Icon = step.icon

          return (
            <button
              type="button"
              key={step.id}
              onClick={() => router.push(step.href)}
              disabled={index > currentStepIndex}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                isComplete
                  ? 'border-green-200 bg-green-50'
                  : isCurrent
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  isComplete
                    ? 'bg-green-100'
                    : isCurrent
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <Icon
                    className={`h-6 w-6 ${
                      isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isComplete
                      ? 'text-green-800'
                      : isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-sm ${
                    isComplete
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-gray-600'
                        : 'text-gray-400'
                  }`}
                >
                  {isComplete ? 'Completed' : step.description}
                </p>
              </div>
              {isCurrent && (
                <span className="text-sm font-medium text-blue-600">
                  Start →
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Skip button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now, I&apos;ll set this up later
        </button>
      </div>
    </div>
  )
}
