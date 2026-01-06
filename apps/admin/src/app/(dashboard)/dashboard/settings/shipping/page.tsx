'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Save,
  Settings,
} from 'lucide-react'

interface SendleSettings {
  apiKey?: string
  senderId?: string
  isConnected: boolean
  connectedAt?: string
  environment: 'sandbox' | 'production'
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
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')

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
    } catch (err) {
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
          setSuccess('Connection successful! Your Sendle credentials are valid.')
          // Update the settings to show connected status
          setSettings(prev => prev ? { ...prev, isConnected: true, connectedAt: new Date().toISOString() } : null)
        } else {
          setError(data.message || 'Connection test failed')
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Connection test failed')
      }
    } catch (err) {
      setError('Failed to test connection')
    } finally {
      setIsTesting(false)
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
          Configure Sendle integration for real-time shipping quotes and label generation
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
                <h2 className="text-lg font-semibold text-gray-900">Sendle API</h2>
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
            <label htmlFor="senderId" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
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
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Your API key will be encrypted before storage
            </p>
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

      {/* Getting Started */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Getting Started with Sendle</h2>
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
                </a>
                {' '}if you don&apos;t have one already.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                2
              </span>
              <span>
                Go to <strong>Settings &rarr; API Keys</strong> in your Sendle dashboard.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                3
              </span>
              <span>
                Copy your <strong>Sender ID</strong> and <strong>API Key</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                4
              </span>
              <span>
                Paste them above and click &quot;Test Connection&quot; to verify.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">About Sendle</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>&bull; Sendle offers competitive rates for Australian domestic shipping</li>
          <li>&bull; Real-time quotes are shown to customers during checkout</li>
          <li>&bull; Labels can be generated directly from your orders page</li>
          <li>&bull; Tracking updates are automatically sent to customers</li>
        </ul>
      </div>
    </div>
  )
}
