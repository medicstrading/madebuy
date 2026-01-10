'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Tenant } from '@madebuy/shared'
import {
  MARKETPLACE_FEATURES,
  MARKETPLACE_LABELS,
  type MarketplacePlatform,
  type MarketplaceConnectionStatus,
} from '@madebuy/shared'
import {
  Instagram,
  Facebook,
  Youtube,
  CheckCircle,
  Loader2,
  AlertCircle,
  Music,
  Pin,
  ExternalLink,
  Unlink,
  Clock,
  RefreshCw,
  Share2,
  ShoppingBag,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface ConnectionsPageProps {
  tenant: Tenant
}

interface LateAccount {
  id: string
  platform: string
  username: string
  displayName: string
  profileImage?: string
  isActive: boolean
}

interface MarketplaceConnectionData {
  connected: boolean
  enabled: boolean
  marketplace: MarketplacePlatform
  status?: MarketplaceConnectionStatus
  shopName?: string
  sellerId?: string
  lastSyncAt?: string
  lastError?: string
  tokenExpiresAt?: string
  createdAt?: string
}

type TabId = 'social' | 'marketplaces'

// =============================================================================
// Platform Configs
// =============================================================================

const socialPlatforms = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-purple-600 via-pink-600 to-orange-500',
    bgColor: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
    available: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music,
    gradient: 'from-gray-900 to-black',
    bgColor: 'bg-black',
    available: true,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: Pin,
    gradient: 'from-red-600 to-red-700',
    bgColor: 'bg-red-600',
    available: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    gradient: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-600',
    available: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    gradient: 'from-red-600 to-red-700',
    bgColor: 'bg-red-600',
    available: true,
  },
]

const marketplacePlatforms: {
  id: MarketplacePlatform
  name: string
  bgColor: string
  borderColor: string
  iconColor: string
  buttonColor: string
}[] = [
  {
    id: 'ebay',
    name: 'eBay',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
  },
]

// =============================================================================
// Tab Component
// =============================================================================

function Tabs({
  activeTab,
  onTabChange,
  socialCount,
  marketplaceCount,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  socialCount: number
  marketplaceCount: number
}) {
  const tabs = [
    { id: 'social' as TabId, label: 'Social', icon: Share2, count: socialCount },
    { id: 'marketplaces' as TabId, label: 'Marketplaces', icon: ShoppingBag, count: marketplaceCount },
  ]

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                    isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// =============================================================================
// Social Card Component
// =============================================================================

function SocialCard({
  platform,
  account,
  isConnecting,
  onConnect,
  onDisconnect,
}: {
  platform: (typeof socialPlatforms)[0]
  account?: LateAccount
  isConnecting: boolean
  onConnect: () => void
  onDisconnect: (accountId: string) => void
}) {
  const Icon = platform.icon
  const isConnected = !!account

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Platform header */}
      <div className="flex items-start gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${platform.bgColor}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
          </div>
          {isConnected ? (
            <div className="mt-1">
              <p className="text-sm text-gray-600 truncate">@{account.username}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                Connected
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Not connected</p>
          )}
        </div>
        {account?.profileImage && (
          <img
            src={account.profileImage}
            alt={account.displayName}
            className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
          />
        )}
      </div>

      {/* Action button */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
        {isConnected ? (
          <button
            onClick={() => onDisconnect(account.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-red-300 hover:text-red-600"
          >
            <Unlink className="h-4 w-4" />
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${platform.gradient} px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Marketplace Card Component
// =============================================================================

function MarketplaceCard({
  platform,
  connection,
  isLoading,
  isDisconnecting,
  isToggling,
  onDisconnect,
  onToggleEnabled,
}: {
  platform: (typeof marketplacePlatforms)[0]
  connection: MarketplaceConnectionData | null
  isLoading: boolean
  isDisconnecting: boolean
  isToggling: boolean
  onDisconnect: () => void
  onToggleEnabled: (enabled: boolean) => void
}) {
  const features = MARKETPLACE_FEATURES[platform.id]
  const isConnected = connection?.connected
  const isEnabled = connection?.enabled ?? false

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Platform icons (inline SVG for eBay/Etsy brand marks)
  const PlatformIcon = () => {
    if (platform.id === 'ebay') {
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M5.939 12.012c0-2.079 1.107-3.544 2.693-3.544 1.585 0 2.694 1.465 2.694 3.544 0 2.078-1.109 3.543-2.694 3.543-1.586 0-2.693-1.465-2.693-3.543m7.674 0c0-3.466-2.279-5.936-4.981-5.936-2.704 0-4.98 2.47-4.98 5.936 0 3.465 2.276 5.935 4.98 5.935 2.702 0 4.981-2.47 4.981-5.935" />
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm0-22C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${platform.borderColor} ${platform.bgColor} shadow-sm transition-all hover:shadow-md`}
    >
      {/* Platform header */}
      <div className="flex items-start gap-4 border-b border-gray-100 bg-white p-5">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${platform.bgColor} ${platform.iconColor}`}
        >
          <PlatformIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
            {features.comingSoon && !isConnected && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Soon
              </span>
            )}
            {isConnected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
          {isLoading ? (
            <Loader2 className="mt-2 h-4 w-4 animate-spin text-gray-400" />
          ) : isConnected ? (
            <div className="mt-1 space-y-0.5">
              {connection?.shopName && (
                <p className="text-sm text-gray-600 truncate">{connection.shopName}</p>
              )}
              {connection?.lastSyncAt && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Synced {formatLastSync(connection.lastSyncAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Not connected</p>
          )}
        </div>
      </div>

      {/* Error display */}
      {connection?.lastError && (
        <div className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{connection.lastError}</span>
        </div>
      )}

      {/* Enable toggle + Actions */}
      <div className="px-5 py-4 space-y-3">
        {isConnected && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Show in sidebar</p>
              <p className="text-xs text-gray-500">Enable to manage listings</p>
            </div>
            <button
              onClick={() => onToggleEnabled(!isEnabled)}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {isConnected ? (
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            {isDisconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            Disconnect
          </button>
        ) : (
          <a
            href={`/api/marketplace/${platform.id}/connect`}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm ${platform.buttonColor} transition-colors`}
          >
            <ExternalLink className="h-4 w-4" />
            Connect {platform.name}
          </a>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ConnectionsPage({ tenant }: ConnectionsPageProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('social')

  // Social state
  const [socialAccounts, setSocialAccounts] = useState<LateAccount[]>([])
  const [socialLoading, setSocialLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  // Marketplace state
  const [ebayConnection, setEbayConnection] = useState<MarketplaceConnectionData | null>(null)
  const [etsyConnection, setEtsyConnection] = useState<MarketplaceConnectionData | null>(null)
  const [marketplaceLoading, setMarketplaceLoading] = useState({ ebay: true, etsy: true })
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<MarketplacePlatform | null>(null)
  const [togglingPlatform, setTogglingPlatform] = useState<MarketplacePlatform | null>(null)

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle URL params for OAuth callbacks
  useEffect(() => {
    const success = searchParams?.get('success')
    const error = searchParams?.get('error')
    const tab = searchParams?.get('tab')

    if (tab === 'marketplaces') {
      setActiveTab('marketplaces')
    }

    if (success) {
      if (success === 'ebay' || success === 'etsy') {
        setMessage({ type: 'success', text: `Successfully connected to ${MARKETPLACE_LABELS[success as MarketplacePlatform]}!` })
        setActiveTab('marketplaces')
      } else {
        setMessage({ type: 'success', text: 'Successfully connected! Your account should appear below.' })
      }
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) })
      window.history.replaceState({}, '', window.location.pathname)
    }

    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [searchParams])

  // Fetch social connections
  const fetchSocialConnections = useCallback(async () => {
    try {
      setSocialLoading(true)
      const response = await fetch('/api/late/accounts')
      const data = await response.json()
      if (response.ok) {
        setSocialAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error fetching social connections:', error)
    } finally {
      setSocialLoading(false)
    }
  }, [])

  // Fetch marketplace connections
  const fetchEbayStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/ebay')
      if (res.ok) {
        setEbayConnection(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch eBay status:', error)
    } finally {
      setMarketplaceLoading((prev) => ({ ...prev, ebay: false }))
    }
  }, [])

  const fetchEtsyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/etsy')
      if (res.ok) {
        setEtsyConnection(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch Etsy status:', error)
    } finally {
      setMarketplaceLoading((prev) => ({ ...prev, etsy: false }))
    }
  }, [])

  useEffect(() => {
    fetchSocialConnections()
    fetchEbayStatus()
    fetchEtsyStatus()
  }, [fetchSocialConnections, fetchEbayStatus, fetchEtsyStatus])

  // Connect social platform
  async function handleSocialConnect(platform: string) {
    setConnectingPlatform(platform)
    try {
      const response = await fetch(`/api/social/connect/${platform}`, { method: 'POST' })
      const data = await response.json()
      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to get authorization URL')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to connect' })
      setConnectingPlatform(null)
    }
  }

  // Disconnect social platform
  async function handleSocialDisconnect(accountId: string, platformName: string) {
    if (!confirm(`Are you sure you want to disconnect from ${platformName}?`)) return
    try {
      const response = await fetch(`/api/late/accounts/${accountId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchSocialConnections()
        setMessage({ type: 'success', text: `Disconnected from ${platformName}` })
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect' })
    }
  }

  // Disconnect marketplace
  async function handleMarketplaceDisconnect(platform: MarketplacePlatform) {
    if (!confirm(`Are you sure you want to disconnect from ${MARKETPLACE_LABELS[platform]}?`)) return
    setDisconnectingPlatform(platform)
    try {
      const res = await fetch(`/api/marketplace/${platform}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: `Disconnected from ${MARKETPLACE_LABELS[platform]}` })
        if (platform === 'ebay') {
          setEbayConnection(null)
          fetchEbayStatus()
        } else {
          setEtsyConnection(null)
          fetchEtsyStatus()
        }
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect' })
    } finally {
      setDisconnectingPlatform(null)
    }
  }

  // Toggle marketplace enabled
  async function handleToggleEnabled(platform: MarketplacePlatform, enabled: boolean) {
    setTogglingPlatform(platform)
    try {
      const res = await fetch(`/api/marketplace/${platform}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        // Update local state
        if (platform === 'ebay') {
          setEbayConnection((prev) => prev ? { ...prev, enabled } : null)
        } else {
          setEtsyConnection((prev) => prev ? { ...prev, enabled } : null)
        }
        setMessage({
          type: 'success',
          text: `${MARKETPLACE_LABELS[platform]} ${enabled ? 'enabled' : 'disabled'} in sidebar`,
        })
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update' })
    } finally {
      setTogglingPlatform(null)
    }
  }

  // Count connected
  const socialConnectedCount = socialAccounts.filter((a) => a.isActive).length
  const marketplaceConnectedCount = (ebayConnection?.connected ? 1 : 0) + (etsyConnection?.connected ? 1 : 0)

  // Get account by platform
  const getAccountByPlatform = (platform: string) =>
    socialAccounts.find((acc) => acc.platform === platform && acc.isActive)

  // Refresh all
  const handleRefresh = () => {
    setSocialLoading(true)
    setMarketplaceLoading({ ebay: true, etsy: true })
    fetchSocialConnections()
    fetchEbayStatus()
    fetchEtsyStatus()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="mt-1 text-gray-500">
            Connect your accounts to publish content and sync inventory
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        socialCount={socialConnectedCount}
        marketplaceCount={marketplaceConnectedCount}
      />

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'social' && (
          <div className="space-y-6">
            {socialLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {socialPlatforms.map((platform) => (
                    <SocialCard
                      key={platform.id}
                      platform={platform}
                      account={getAccountByPlatform(platform.id)}
                      isConnecting={connectingPlatform === platform.id}
                      onConnect={() => handleSocialConnect(platform.id)}
                      onDisconnect={(accountId) => handleSocialDisconnect(accountId, platform.name)}
                    />
                  ))}
                </div>

                {/* Info box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">About Social Connections</h3>
                  <ul className="space-y-1.5 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <span>Publish products directly to your connected accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <span>AI-generated captions tailored to each platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <span>Schedule posts for optimal engagement times</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'marketplaces' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {marketplacePlatforms.map((platform) => (
                <MarketplaceCard
                  key={platform.id}
                  platform={platform}
                  connection={platform.id === 'ebay' ? ebayConnection : etsyConnection}
                  isLoading={marketplaceLoading[platform.id]}
                  isDisconnecting={disconnectingPlatform === platform.id}
                  isToggling={togglingPlatform === platform.id}
                  onDisconnect={() => handleMarketplaceDisconnect(platform.id)}
                  onToggleEnabled={(enabled) => handleToggleEnabled(platform.id, enabled)}
                />
              ))}
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">About Marketplace Sync</h3>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>Listings sync automatically every 15 minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>Inventory updates pushed in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>Orders imported hourly for unified fulfillment</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
