'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  Clock,
} from 'lucide-react'
import {
  MARKETPLACE_FEATURES,
  MARKETPLACE_LABELS,
  type MarketplacePlatform,
  type MarketplaceConnectionStatus,
} from '@madebuy/shared'

interface MarketplaceConnectionData {
  connected: boolean
  marketplace: MarketplacePlatform
  status?: MarketplaceConnectionStatus
  shopName?: string
  sellerId?: string
  lastSyncAt?: string
  lastError?: string
  tokenExpiresAt?: string
  createdAt?: string
}

interface ConnectionCardProps {
  platform: MarketplacePlatform
  connection: MarketplaceConnectionData | null
  isLoading: boolean
  onDisconnect: () => Promise<void>
  isDisconnecting: boolean
}

function ConnectionCard({
  platform,
  connection,
  isLoading,
  onDisconnect,
  isDisconnecting,
}: ConnectionCardProps) {
  const features = MARKETPLACE_FEATURES[platform]
  const label = MARKETPLACE_LABELS[platform]
  const isConnected = connection?.connected

  // Platform-specific branding
  const brandColors = {
    ebay: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    etsy: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
  }

  const colors = brandColors[platform]

  // Format last sync time
  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg} ${colors.icon}`}>
              {platform === 'ebay' ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M5.939 12.012c0-2.079 1.107-3.544 2.693-3.544 1.585 0 2.694 1.465 2.694 3.544 0 2.078-1.109 3.543-2.694 3.543-1.586 0-2.693-1.465-2.693-3.543m7.674 0c0-3.466-2.279-5.936-4.981-5.936-2.704 0-4.98 2.47-4.98 5.936 0 3.465 2.276 5.935 4.98 5.935 2.702 0 4.981-2.47 4.981-5.935" />
                  <path d="M14.35 6.076h2.138v11.84h-2.138V6.077zm5.51 0h-2.138v.89c.767-.667 1.774-1.07 2.878-1.07 2.488 0 4.5 2.023 4.5 5.116 0 3.094-2.012 5.116-4.5 5.116-1.104 0-2.11-.403-2.878-1.07v4.859h-2.138V6.077h2.138v.89c.767-.666 1.774-1.07 2.878-1.07-.001 0-.74.179-.74 0m3.94 4.936c0-1.893-1.084-3.125-2.466-3.125-1.381 0-2.465 1.232-2.465 3.125 0 1.892 1.084 3.124 2.465 3.124 1.382 0 2.465-1.232 2.465-3.124" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm0-22C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.5 14.5c-1.5 1.5-3.5 2.5-5.5 2.5s-4-1-5.5-2.5c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0 1.2 1.2 2.6 1.9 4.1 1.9s2.9-.7 4.1-1.9c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4zM8.5 11c-.8 0-1.5-.7-1.5-1.5S7.7 8 8.5 8s1.5.7 1.5 1.5S9.3 11 8.5 11zm7 0c-.8 0-1.5-.7-1.5-1.5S14.7 8 15.5 8s1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {features.comingSoon && !isConnected && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Coming Soon
              </span>
            )}
            {isConnected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : isConnected ? (
          // Connected state
          <div className="space-y-4">
            {/* Shop info */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <dl className="grid grid-cols-2 gap-4">
                {connection?.shopName && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Shop Name</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {connection.shopName}
                    </dd>
                  </div>
                )}
                {connection?.sellerId && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Seller ID</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {connection.sellerId}
                    </dd>
                  </div>
                )}
                {connection?.lastSyncAt && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Last Sync</dt>
                    <dd className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3.5 w-3.5" />
                      {formatLastSync(connection.lastSyncAt)}
                    </dd>
                  </div>
                )}
                {connection?.status && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm capitalize text-gray-900">
                      {connection.status}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Error display */}
            {connection?.lastError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{connection.lastError}</span>
              </div>
            )}

            {/* Disconnect button */}
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              Disconnect {label}
            </button>
          </div>
        ) : (
          // Not connected state
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {features.comingSoon
                ? `We're working on ${label} integration. Connect your account to be notified when it's ready.`
                : `Connect your ${label} account to sync your listings, inventory, and orders.`}
            </p>

            {/* Feature list */}
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Sync product listings automatically
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Keep inventory counts in sync
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Import orders for unified fulfillment
              </li>
              {features.supportsVariations && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Support for product variations
                </li>
              )}
              {features.supportsPersonalization && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Handle personalization requests
                </li>
              )}
            </ul>

            {/* Connect button */}
            <a
              href={`/api/marketplace/${platform}/connect`}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm ${colors.button} transition-colors`}
            >
              <ExternalLink className="h-4 w-4" />
              Connect {label}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MarketplaceSettingsPage() {
  const searchParams = useSearchParams()
  const [ebayConnection, setEbayConnection] = useState<MarketplaceConnectionData | null>(null)
  const [etsyConnection, setEtsyConnection] = useState<MarketplaceConnectionData | null>(null)
  const [isLoadingEbay, setIsLoadingEbay] = useState(true)
  const [isLoadingEtsy, setIsLoadingEtsy] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState<MarketplacePlatform | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check URL params for success/error messages
  useEffect(() => {
    const success = searchParams?.get('success')
    const error = searchParams?.get('error')

    if (success === 'ebay') {
      setMessage({ type: 'success', text: 'Successfully connected to eBay!' })
    } else if (success === 'etsy') {
      setMessage({ type: 'success', text: 'Successfully connected to Etsy!' })
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) })
    }

    // Clear message after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Fetch eBay connection status
  const fetchEbayStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/ebay')
      if (res.ok) {
        const data = await res.json()
        setEbayConnection(data)
      }
    } catch (error) {
      console.error('Failed to fetch eBay status:', error)
    } finally {
      setIsLoadingEbay(false)
    }
  }, [])

  // Fetch Etsy connection status
  const fetchEtsyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/etsy')
      if (res.ok) {
        const data = await res.json()
        setEtsyConnection(data)
      }
    } catch (error) {
      console.error('Failed to fetch Etsy status:', error)
    } finally {
      setIsLoadingEtsy(false)
    }
  }, [])

  useEffect(() => {
    fetchEbayStatus()
    fetchEtsyStatus()
  }, [fetchEbayStatus, fetchEtsyStatus])

  // Disconnect marketplace
  const handleDisconnect = async (platform: MarketplacePlatform) => {
    setIsDisconnecting(platform)
    setMessage(null)

    try {
      const res = await fetch(`/api/marketplace/${platform}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage({ type: 'success', text: `Successfully disconnected from ${MARKETPLACE_LABELS[platform]}` })
        // Refresh connection status
        if (platform === 'ebay') {
          setEbayConnection(null)
          fetchEbayStatus()
        } else {
          setEtsyConnection(null)
          fetchEtsyStatus()
        }
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' })
    } finally {
      setIsDisconnecting(null)
    }
  }

  // Refresh all connections
  const handleRefresh = () => {
    setIsLoadingEbay(true)
    setIsLoadingEtsy(true)
    fetchEbayStatus()
    fetchEtsyStatus()
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Connections</h1>
          <p className="mt-1 text-gray-500">
            Connect your eBay and Etsy accounts to sync listings and orders
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Marketplace Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* eBay */}
        <ConnectionCard
          platform="ebay"
          connection={ebayConnection}
          isLoading={isLoadingEbay}
          onDisconnect={() => handleDisconnect('ebay')}
          isDisconnecting={isDisconnecting === 'ebay'}
        />

        {/* Etsy */}
        <ConnectionCard
          platform="etsy"
          connection={etsyConnection}
          isLoading={isLoadingEtsy}
          onDisconnect={() => handleDisconnect('etsy')}
          isDisconnecting={isDisconnecting === 'etsy'}
        />
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">About Marketplace Sync</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>- Your marketplace credentials are securely encrypted and never exposed</li>
          <li>- Listings sync automatically every 15 minutes</li>
          <li>- Inventory updates are pushed in real-time when you make changes in MadeBuy</li>
          <li>- Orders are imported hourly and can be fulfilled from one dashboard</li>
        </ul>
      </div>
    </div>
  )
}
