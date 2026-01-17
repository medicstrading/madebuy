'use client'

import type { RegionalSettings } from '@madebuy/shared'
import {
  COUNTRY_PRESETS,
  DEFAULT_REGIONAL_SETTINGS,
  getCountryPreset,
} from '@madebuy/shared'
import { Check, Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function RegionalSettingsPage() {
  const [settings, setSettings] = useState<RegionalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/tenant')
        if (res.ok) {
          const tenant = await res.json()
          if (tenant.regionalSettings) {
            setSettings(tenant.regionalSettings)
          } else {
            // Default to AU
            setSettings(DEFAULT_REGIONAL_SETTINGS)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setSettings(DEFAULT_REGIONAL_SETTINGS)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleCountryChange = (countryCode: string) => {
    const preset = getCountryPreset(countryCode)
    if (!preset) return

    setSettings({
      countryCode: preset.code,
      currency: preset.currency,
      locale: preset.locale,
      timezone: preset.timezone,
      measurementSystem: preset.measurementSystem,
    })
    setHasChanges(true)
  }

  const handleTimezoneChange = (timezone: string) => {
    if (!settings) return
    setSettings({ ...settings, customTimezone: timezone })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setMessage(null)

    const currentPreset = getCountryPreset(settings.countryCode)

    try {
      const res = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionalSettings: settings,
          location: currentPreset?.name || settings.countryCode,
        }),
      })

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Regional settings saved! Reloading...',
        })
        setHasChanges(false)
        // Reload to update the RegionalProvider context
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentPreset = getCountryPreset(settings.countryCode)
  const effectiveTimezone = settings.customTimezone || settings.timezone

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regional Settings</h1>
        <p className="text-gray-600">
          Configure currency, date format, and timezone for your store
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : null}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {/* Country Selection */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country / Region
          </label>
          <select
            value={settings.countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full max-w-md rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            {COUNTRY_PRESETS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500">
            Changing your country updates currency, date format, and timezone
            defaults
          </p>
        </div>

        {/* Timezone Selection */}
        {currentPreset?.popularTimezones &&
          currentPreset.popularTimezones.length > 1 && (
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={effectiveTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full max-w-md rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                {currentPreset.popularTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

        {/* Current Settings Preview */}
        <div className="p-6 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Current Settings Preview
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Currency</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {new Intl.NumberFormat(settings.locale, {
                  style: 'currency',
                  currency: settings.customCurrency || settings.currency,
                }).format(1234.56)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Date Format</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {new Intl.DateTimeFormat(
                  settings.customLocale || settings.locale,
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  },
                ).format(new Date())}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Time Format</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {new Intl.DateTimeFormat(
                  settings.customLocale || settings.locale,
                  {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: effectiveTimezone,
                  },
                ).format(new Date())}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Measurement System</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900 capitalize">
                {settings.measurementSystem}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Timezone</dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {effectiveTimezone.replace(/_/g, ' ')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Save Button */}
        <div className="p-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
