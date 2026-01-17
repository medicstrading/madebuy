'use client'

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Save,
  Settings,
  TestTube,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface BusinessAddress {
  addressLine1: string
  addressLine2?: string
  suburb: string
  state: string
  postcode: string
  country: string
}

interface SendleSettings {
  apiKey?: string
  senderId?: string
  isConnected: boolean
  connectedAt?: string
  environment: 'sandbox' | 'production'
  pickupAddress?: BusinessAddress
  freeShippingThreshold?: number | null
}

export default function ShippingSettingsPage() {
  const [settings, setSettings] = useState<SendleSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  // Form state
  const [apiKey, setApiKey] = useState('')
  const [senderId, setSenderId] = useState('')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(
    'sandbox',
  )

  // Pickup address state
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [postcode, setPostcode] = useState('')

  // Free shipping threshold state (stored as dollars for UI, converted to cents for API)
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)
  const [freeShippingAmount, setFreeShippingAmount] = useState('')
  const [isSavingFreeShipping, setIsSavingFreeShipping] = useState(false)

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/shipping/sendle')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
          if (data.apiKey) setApiKey(data.apiKey)
          if (data.senderId) setSenderId(data.senderId)
          if (data.environment) setEnvironment(data.environment)
          // Load pickup address
          if (data.pickupAddress) {
            setAddressLine1(data.pickupAddress.addressLine1 || '')
            setAddressLine2(data.pickupAddress.addressLine2 || '')
            setSuburb(data.pickupAddress.suburb || '')
            setState(data.pickupAddress.state || '')
            setPostcode(data.pickupAddress.postcode || '')
          }
          // Load free shipping threshold
          if (data.freeShippingThreshold) {
            setFreeShippingEnabled(true)
            // Convert from cents to dollars for display
            setFreeShippingAmount((data.freeShippingThreshold / 100).toString())
          }
        }
      } catch (err) {
        console.error('Failed to load shipping settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Save credentials
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/shipping/sendle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          senderId,
          environment,
          pickupAddress: {
            addressLine1,
            addressLine2: addressLine2 || undefined,
            suburb,
            state,
            postcode,
            country: 'AU',
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setSuccess('Sendle credentials saved successfully.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save credentials')
      }
    } catch (_err) {
      setError('Failed to save credentials')
    } finally {
      setIsSaving(false)
    }
  }

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/shipping/sendle/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          senderId,
          environment,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess(
            'Connection successful! Your Sendle credentials are valid.',
          )
          // Update the settings to show connected status
          setSettings((prev) =>
            prev
              ? {
                  ...prev,
                  isConnected: true,
                  connectedAt: new Date().toISOString(),
                }
              : null,
          )
        } else {
          setError(data.message || 'Connection test failed')
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Connection test failed')
      }
    } catch (_err) {
      setError('Failed to test connection')
    } finally {
      setIsTesting(false)
    }
  }

  // Save free shipping threshold
  const handleSaveFreeShipping = async () => {
    setIsSavingFreeShipping(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert dollars to cents, or null if disabled
      const thresholdCents =
        freeShippingEnabled && freeShippingAmount
          ? Math.round(parseFloat(freeShippingAmount) * 100)
          : null

      const response = await fetch('/api/shipping/sendle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeShippingThreshold: thresholdCents,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings((prev) =>
          prev
            ? { ...prev, freeShippingThreshold: data.freeShippingThreshold }
            : null,
        )
        setSuccess('Free shipping threshold saved successfully.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save free shipping settings')
      }
    } catch (_err) {
      setError('Failed to save free shipping settings')
    } finally {
      setIsSavingFreeShipping(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
        <p className="mt-1 text-gray-500">
          Configure Sendle integration for real-time shipping quotes and label
          generation
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{success}</p>
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

      {/* Sendle Integration Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Sendle API
                </h2>
                <p className="text-sm text-gray-500">
                  Connect your Sendle account for shipping
                </p>
              </div>
            </div>
            {settings?.isConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Connected
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Environment Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  environment === 'sandbox'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Sandbox (Testing)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  environment === 'production'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Production
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {environment === 'sandbox'
                ? 'Use sandbox for testing. No real shipments will be created.'
                : 'Production mode will create real shipments and charge your account.'}
            </p>
          </div>

          {/* Sender ID */}
          <div>
            <label
              htmlFor="senderId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sender ID
            </label>
            <input
              id="senderId"
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              placeholder="Enter your Sendle Sender ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Found in your Sendle dashboard under Settings &rarr; API Keys
            </p>
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Sendle API Key"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Your API key will be encrypted before storage
            </p>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Pickup Address Section */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Pickup Address
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This address will be used as the shipping origin for all quotes
              and labels.
            </p>

            <div className="space-y-4">
              {/* Address Line 1 */}
              <div>
                <label
                  htmlFor="addressLine1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Street Address
                </label>
                <input
                  id="addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label
                  htmlFor="addressLine2"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit/Suite (optional)
                </label>
                <input
                  id="addressLine2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Unit 1, Level 2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Suburb, State, Postcode row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="suburb"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Suburb
                  </label>
                  <input
                    id="suburb"
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="BRISBANE"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    State
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="postcode"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Postcode
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="4000"
                    maxLength={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Connected Info */}
          {settings?.isConnected && settings.connectedAt && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Last verified: {new Date(settings.connectedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey || !senderId}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !apiKey || !senderId}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Credentials
            </button>
          </div>
        </div>
      </section>

      {/* Free Shipping Threshold Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Free Shipping Threshold
              </h2>
              <p className="text-sm text-gray-500">
                Offer free shipping for orders above a certain amount
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="freeShippingEnabled"
                className="text-sm font-medium text-gray-700"
              >
                Enable free shipping threshold
              </label>
              <p className="text-sm text-gray-500">
                Customers will get free shipping when their order exceeds this
                amount
              </p>
            </div>
            <button
              type="button"
              type="button"
              role="switch"
              aria-checked={freeShippingEnabled}
              onClick={() => setFreeShippingEnabled(!freeShippingEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                freeShippingEnabled ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  freeShippingEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Threshold Amount */}
          {freeShippingEnabled && (
            <div>
              <label
                htmlFor="freeShippingAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Minimum order amount for free shipping
              </label>
              <div className="relative mt-1 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="freeShippingAmount"
                  min="0"
                  step="0.01"
                  value={freeShippingAmount}
                  onChange={(e) => setFreeShippingAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-12 py-2 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 sm:text-sm">AUD</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Orders of ${freeShippingAmount || '0'} or more will qualify for
                free shipping
              </p>
            </div>
          )}

          {/* Preview */}
          {freeShippingEnabled &&
            freeShippingAmount &&
            parseFloat(freeShippingAmount) > 0 && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Preview: How customers will see this
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Cart message: &quot;Add $
                      {(parseFloat(freeShippingAmount) - 50).toFixed(2)} more
                      for free shipping!&quot;
                    </p>
                    <p className="text-sm text-green-700">
                      Checkout: Orders over $
                      {parseFloat(freeShippingAmount).toFixed(2)} will show
                      &quot;Free Shipping&quot; as an option
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveFreeShipping}
              disabled={
                isSavingFreeShipping ||
                (freeShippingEnabled && !freeShippingAmount)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingFreeShipping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Free Shipping Settings
            </button>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Getting Started with Sendle
              </h2>
              <p className="text-sm text-gray-500">
                How to set up your Sendle account
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                1
              </span>
              <span>
                <a
                  href="https://www.sendle.com/au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Create a Sendle account
                </a>{' '}
                if you don&apos;t have one already.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                2
              </span>
              <span>
                Go to <strong>Settings &rarr; API Keys</strong> in your Sendle
                dashboard.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                3
              </span>
              <span>
                Copy your <strong>Sender ID</strong> and{' '}
                <strong>API Key</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                4
              </span>
              <span>
                Paste them above and click &quot;Test Connection&quot; to
                verify.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">
          About Sendle
        </h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            &bull; Sendle offers competitive rates for Australian domestic
            shipping
          </li>
          <li>
            &bull; Real-time quotes are shown to customers during checkout
          </li>
          <li>&bull; Labels can be generated directly from your orders page</li>
          <li>&bull; Tracking updates are automatically sent to customers</li>
        </ul>
      </div>
    </div>
  )
}
