'use client'

import { useState, useEffect } from 'react'
import { Percent, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { TenantTaxSettings } from '@madebuy/shared'

export default function TaxSettingsPage() {
  const [settings, setSettings] = useState<TenantTaxSettings>({
    gstRegistered: false,
    abn: '',
    gstRate: 10,
    pricesIncludeGst: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [abnError, setAbnError] = useState<string | null>(null)

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/tenant/tax')
        if (res.ok) {
          const data = await res.json()
          setSettings(data.taxSettings || {
            gstRegistered: false,
            abn: '',
            gstRate: 10,
            pricesIncludeGst: true,
          })
        }
      } catch (error) {
        console.error('Failed to fetch tax settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Validate ABN format (11 digits)
  const validateABN = (abn: string): boolean => {
    const cleanAbn = abn.replace(/\s/g, '')
    if (cleanAbn.length !== 11) {
      setAbnError('ABN must be exactly 11 digits')
      return false
    }
    if (!/^\d+$/.test(cleanAbn)) {
      setAbnError('ABN must contain only numbers')
      return false
    }
    setAbnError(null)
    return true
  }

  const handleSave = async () => {
    // Validate ABN if GST registered
    if (settings.gstRegistered && settings.abn) {
      if (!validateABN(settings.abn)) {
        return
      }
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxSettings: {
            ...settings,
            abn: settings.abn?.replace(/\s/g, ''), // Clean ABN
          },
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Tax settings saved successfully!' })
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const formatABN = (value: string): string => {
    // Format ABN as: XX XXX XXX XXX
    const cleaned = value.replace(/\D/g, '').slice(0, 11)
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tax / GST Settings</h1>
        <p className="mt-1 text-gray-600">
          Configure your GST registration and tax settings for Australian sales
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-6">
          {/* GST Registration Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">GST Registered</h3>
                <p className="text-sm text-gray-500">
                  Are you registered for Goods and Services Tax (GST) in Australia?
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({ ...s, gstRegistered: !s.gstRegistered }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.gstRegistered ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.gstRegistered ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ABN Field (shown if GST registered) */}
          {settings.gstRegistered && (
            <>
              <div>
                <label
                  htmlFor="abn"
                  className="block text-sm font-medium text-gray-900"
                >
                  Australian Business Number (ABN)
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Your 11-digit ABN for tax invoices
                </p>
                <input
                  type="text"
                  id="abn"
                  value={formatABN(settings.abn || '')}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setSettings((s) => ({ ...s, abn: cleaned }))
                    if (abnError) validateABN(cleaned)
                  }}
                  placeholder="XX XXX XXX XXX"
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    abnError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {abnError && (
                  <p className="mt-1 text-sm text-red-600">{abnError}</p>
                )}
              </div>

              {/* GST Rate */}
              <div>
                <label
                  htmlFor="gstRate"
                  className="block text-sm font-medium text-gray-900"
                >
                  GST Rate
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Standard Australian GST rate is 10%
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    id="gstRate"
                    value={settings.gstRate}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        gstRate: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                      }))
                    }
                    min="0"
                    max="100"
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Prices Include GST */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Prices Include GST
                    </h3>
                    <p className="text-sm text-gray-500">
                      Are your product prices GST-inclusive? (Recommended for B2C)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        pricesIncludeGst: !s.pricesIncludeGst,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      settings.pricesIncludeGst ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.pricesIncludeGst ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">About GST in Australia</h4>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>GST registration is required if annual turnover exceeds $75,000</li>
              <li>GST rate in Australia is 10%</li>
              <li>If registered, you must display prices inclusive of GST to consumers</li>
              <li>You can claim GST credits on business purchases</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end border-t pt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
