'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, ShoppingBag, ArrowRight } from 'lucide-react'
import type { MarketplacePlatform } from '@madebuy/shared'

interface MarketplaceConnectPromptProps {
  platform: MarketplacePlatform
  platformName: string
  platformColor: 'blue' | 'orange'
  description: string
  features: string[]
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-700',
    icon: 'bg-blue-100 text-blue-600',
  },
  orange: {
    bg: 'bg-orange-600',
    bgLight: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-700',
    icon: 'bg-orange-100 text-orange-600',
  },
}

export function MarketplaceConnectPrompt({
  platform,
  platformName,
  platformColor,
  description,
  features,
}: MarketplaceConnectPromptProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const colors = colorClasses[platformColor]

  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const response = await fetch(`/api/marketplace/${platform}/connect`)
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setError(data.error || 'Failed to get authorization URL')
        setIsConnecting(false)
      }
    } catch (err) {
      console.error('Failed to initiate connection:', err)
      setError('Connection failed. Please try again.')
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${colors.icon} mb-4`}>
            <span className="text-2xl font-bold">
              {platform === 'ebay' ? 'e' : 'E'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect to {platformName}
          </h1>
          <p className="text-gray-600">
            {description}
          </p>
        </div>

        {/* Features */}
        <div className={`rounded-xl ${colors.bgLight} ${colors.border} border p-6 mb-6`}>
          <h3 className="font-semibold text-gray-900 mb-4">What you can do:</h3>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className={`flex-shrink-0 h-5 w-5 rounded-full ${colors.bg} flex items-center justify-center mt-0.5`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`w-full flex items-center justify-center gap-2 ${colors.bg} ${colors.hover} text-white rounded-lg px-6 py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect {platformName}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-4">
          You'll be redirected to {platformName} to authorize access.
          <br />
          We only request permissions needed for inventory sync.
        </p>
      </div>
    </div>
  )
}
