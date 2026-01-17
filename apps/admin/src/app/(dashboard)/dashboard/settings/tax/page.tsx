'use client'

import type { QuarterlyGSTReport, TenantTaxSettings } from '@madebuy/shared'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  DollarSign,
  FileText,
  Loader2,
  Percent,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'

// Helper to format cents to dollars
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

// Generate quarter options (last 8 quarters)
function getQuarterOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()

  for (let i = 0; i < 8; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const year = date.getFullYear()
    const quarter = Math.floor(date.getMonth() / 3) + 1
    const quarterStr = `${year}-Q${quarter}`
    const quarterLabels = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
    options.push({
      value: quarterStr,
      label: `${quarterLabels[quarter - 1]} ${year}`,
    })
  }

  return options
}

export default function TaxSettingsPage() {
  const [settings, setSettings] = useState<TenantTaxSettings>({
    gstRegistered: false,
    abn: '',
    gstRate: 10,
    pricesIncludeGst: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [abnError, setAbnError] = useState<string | null>(null)

  // Track initial settings to detect unsaved changes
  const initialSettingsRef = useRef<TenantTaxSettings | null>(null)
  const isDirty =
    initialSettingsRef.current !== null &&
    JSON.stringify(settings) !== JSON.stringify(initialSettingsRef.current)

  // Warn user about unsaved changes when leaving the page
  useUnsavedChangesWarning(isDirty)

  // GST Report state
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    return `${now.getFullYear()}-Q${quarter}`
  })
  const [gstReport, setGstReport] = useState<QuarterlyGSTReport | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/tenant/tax')
        if (res.ok) {
          const data = await res.json()
          const fetchedSettings = data.taxSettings || {
            gstRegistered: false,
            abn: '',
            gstRate: 10,
            pricesIncludeGst: true,
          }
          setSettings(fetchedSettings)
          // Store initial settings to detect changes
          initialSettingsRef.current = { ...fetchedSettings }
        }
      } catch (error) {
        console.error('Failed to fetch tax settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Fetch GST report when quarter changes (only if GST registered)
  const fetchGstReport = async (quarter: string) => {
    setIsLoadingReport(true)
    setReportError(null)
    setGstReport(null)

    try {
      const res = await fetch(`/api/reports/gst?quarter=${quarter}`)
      const data = await res.json()

      if (res.ok) {
        setGstReport(data.report)
      } else {
        setReportError(data.error || 'Failed to load GST report')
      }
    } catch (error) {
      console.error('Failed to fetch GST report:', error)
      setReportError('Failed to load GST report. Please try again.')
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Fetch report when quarter changes and user is GST registered
  useEffect(() => {
    if (settings.gstRegistered && !isLoading) {
      fetchGstReport(selectedQuarter)
    }
  }, [selectedQuarter, settings.gstRegistered, isLoading, fetchGstReport])

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
        setMessage({
          type: 'success',
          text: 'Tax settings saved successfully!',
        })
        // Update initial settings reference after successful save
        initialSettingsRef.current = {
          ...settings,
          abn: settings.abn?.replace(/\s/g, ''),
        }
      } else {
        const data = await res.json()
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save settings',
        })
      }
    } catch (_error) {
      setMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatABN = (value: string): string => {
    // Format ABN as: XX XXX XXX XXX
    const cleaned = value.replace(/\D/g, '').slice(0, 11)
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`
    if (cleaned.length <= 8)
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
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
                <h3 className="text-sm font-medium text-gray-900">
                  GST Registered
                </h3>
                <p className="text-sm text-gray-500">
                  Are you registered for Goods and Services Tax (GST) in
                  Australia?
                </p>
              </div>
              <button
                type="button"
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    gstRegistered: !s.gstRegistered,
                  }))
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
                    const cleaned = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 11)
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
                        gstRate: Math.max(
                          0,
                          Math.min(100, parseInt(e.target.value, 10) || 0),
                        ),
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
                      Are your product prices GST-inclusive? (Recommended for
                      B2C)
                    </p>
                  </div>
                  <button
                    type="button"
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
                        settings.pricesIncludeGst
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">
              About GST in Australia
            </h4>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>
                GST registration is required if annual turnover exceeds $75,000
              </li>
              <li>GST rate in Australia is 10%</li>
              <li>
                If registered, you must display prices inclusive of GST to
                consumers
              </li>
              <li>You can claim GST credits on business purchases</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end border-t pt-6">
          <button
            type="button"
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

      {/* GST/BAS Report Section - Only shown if GST registered */}
      {settings.gstRegistered && (
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                GST / BAS Summary Report
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Quarterly GST summary for Business Activity Statement (BAS)
                reporting
              </p>
            </div>

            {/* Quarter Selector */}
            <div className="relative">
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
              >
                {getQuarterOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Report Loading State */}
          {isLoadingReport && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading GST report...</span>
            </div>
          )}

          {/* Report Error State */}
          {reportError && !isLoadingReport && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{reportError}</p>
            </div>
          )}

          {/* Report Data */}
          {gstReport && !isLoadingReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GST Collected */}
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">GST Collected</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-green-800">
                    {formatCurrency(gstReport.gstCollected)}
                  </p>
                  <p className="mt-1 text-sm text-green-600">
                    From {gstReport.salesCount} sales (
                    {formatCurrency(gstReport.salesGross)} gross)
                  </p>
                </div>

                {/* GST on Refunds */}
                <div className="rounded-lg bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">GST on Refunds</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-red-800">
                    {formatCurrency(gstReport.gstPaid)}
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    From {gstReport.refundsCount} refunds (
                    {formatCurrency(gstReport.refundsTotal)} total)
                  </p>
                </div>

                {/* Net GST */}
                <div
                  className={`rounded-lg p-4 ${gstReport.netGst >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 ${gstReport.netGst >= 0 ? 'text-blue-700' : 'text-amber-700'}`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Net GST Payable</span>
                  </div>
                  <p
                    className={`mt-2 text-2xl font-bold ${gstReport.netGst >= 0 ? 'text-blue-800' : 'text-amber-800'}`}
                  >
                    {formatCurrency(Math.abs(gstReport.netGst))}
                  </p>
                  <p
                    className={`mt-1 text-sm ${gstReport.netGst >= 0 ? 'text-blue-600' : 'text-amber-600'}`}
                  >
                    {gstReport.netGst >= 0
                      ? 'Amount to remit to ATO'
                      : 'Refund due from ATO'}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Detailed Breakdown
                </h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                        Item
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2 text-sm text-gray-600">
                        Gross Sales (incl. GST)
                      </td>
                      <td className="py-2 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(gstReport.salesGross)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-sm text-gray-600">
                        GST Component of Sales
                      </td>
                      <td className="py-2 text-sm text-green-600 text-right font-medium">
                        + {formatCurrency(gstReport.gstCollected)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-sm text-gray-600">
                        Net Sales (excl. GST)
                      </td>
                      <td className="py-2 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(gstReport.salesNet)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 text-sm text-gray-600">
                        Total Refunds
                      </td>
                      <td className="py-2 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(gstReport.refundsTotal)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 text-sm text-gray-600">
                        GST Component of Refunds
                      </td>
                      <td className="py-2 text-sm text-red-600 text-right font-medium">
                        - {formatCurrency(gstReport.gstPaid)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 text-sm font-bold text-gray-900">
                        Net GST Payable to ATO
                      </td>
                      <td
                        className={`py-3 text-sm font-bold text-right ${gstReport.netGst >= 0 ? 'text-blue-600' : 'text-amber-600'}`}
                      >
                        {gstReport.netGst >= 0 ? '' : '('}
                        {formatCurrency(Math.abs(gstReport.netGst))}
                        {gstReport.netGst >= 0 ? '' : ')'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Report Period Info */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">
                  Report Period:{' '}
                  {new Date(gstReport.startDate).toLocaleDateString('en-AU')} -{' '}
                  {new Date(gstReport.endDate).toLocaleDateString('en-AU')}
                  {' | '}GST Rate: {gstReport.gstRate}%
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!gstReport && !isLoadingReport && !reportError && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No GST data available for this quarter</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
