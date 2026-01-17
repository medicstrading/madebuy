'use client'

import type { RegionalSettings } from '@madebuy/shared'
import { COUNTRY_PRESETS, getCountryPreset } from '@madebuy/shared'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LocationOnboardingPage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [customTimezone, setCustomTimezone] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch('/api/tenant')
        if (res.ok) {
          const data = await res.json()
          if (data.regionalSettings) {
            setSelectedCountry(data.regionalSettings.countryCode)
            if (data.regionalSettings.customTimezone) {
              setCustomTimezone(data.regionalSettings.customTimezone)
            }
          } else {
            // Default to Australia
            setSelectedCountry('AU')
          }
        }
      } catch (error) {
        console.error('Failed to load tenant:', error)
        setSelectedCountry('AU')
      } finally {
        setIsLoading(false)
      }
    }
    loadTenant()
  }, [])

  const handleSave = async () => {
    if (!selectedCountry) return

    setIsSaving(true)
    const preset = getCountryPreset(selectedCountry)
    if (!preset) {
      setIsSaving(false)
      return
    }

    const regionalSettings: RegionalSettings = {
      countryCode: preset.code,
      currency: preset.currency,
      locale: preset.locale,
      timezone: customTimezone || preset.timezone,
      measurementSystem: preset.measurementSystem,
      ...(customTimezone && { customTimezone }),
    }

    try {
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionalSettings,
          location: preset.name,
          onboardingStep: 'design',
        }),
      })
      router.push('/dashboard/onboarding/design')
    } catch (error) {
      console.error('Failed to save location:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    // Save default AU settings and continue
    const _preset = getCountryPreset('AU')!
    try {
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionalSettings: {
            countryCode: 'AU',
            currency: 'AUD',
            locale: 'en-AU',
            timezone: 'Australia/Sydney',
            measurementSystem: 'metric',
          },
          location: 'Australia',
          onboardingStep: 'design',
        }),
      })
      router.push('/dashboard/onboarding/design')
    } catch (error) {
      console.error('Failed to skip location:', error)
      router.push('/dashboard/onboarding/design')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const selectedPreset = selectedCountry
    ? getCountryPreset(selectedCountry)
    : null

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Where are you located?
        </h1>
        <p className="text-gray-600">
          This sets your currency, date format, and timezone
        </p>
      </div>

      {/* Country Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {COUNTRY_PRESETS.map((country) => (
          <button
            type="button"
            key={country.code}
            onClick={() => {
              setSelectedCountry(country.code)
              setCustomTimezone(null)
            }}
            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
              selectedCountry === country.code
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{country.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {country.name}
                </p>
                <p className="text-xs text-gray-500">{country.currency}</p>
              </div>
            </div>
            {selectedCountry === country.code && (
              <div className="absolute top-2 right-2">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Preview settings */}
      {selectedPreset && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Your settings</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Currency:</dt>
              <dd className="font-medium text-gray-900">
                {new Intl.NumberFormat(selectedPreset.locale, {
                  style: 'currency',
                  currency: selectedPreset.currency,
                }).format(1234.56)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Date format:</dt>
              <dd className="font-medium text-gray-900">
                {new Intl.DateTimeFormat(selectedPreset.locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date())}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Measurements:</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {selectedPreset.measurementSystem}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Timezone:</dt>
              <dd className="font-medium text-gray-900">
                {customTimezone || selectedPreset.timezone}
              </dd>
            </div>
          </dl>

          {/* Timezone selector for multi-zone countries */}
          {selectedPreset.popularTimezones &&
            selectedPreset.popularTimezones.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select your timezone:
                </label>
                <select
                  value={customTimezone || selectedPreset.timezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {selectedPreset.popularTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedCountry || isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
