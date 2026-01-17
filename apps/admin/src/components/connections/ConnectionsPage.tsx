'use client'

import type { Tenant } from '@madebuy/shared'
import {
  MARKETPLACE_FEATURES,
  MARKETPLACE_LABELS,
  type MarketplaceConnectionStatus,
  type MarketplacePlatform,
} from '@madebuy/shared'
import {
  AlertCircle,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Facebook,
  Instagram,
  Link2,
  Loader2,
  Music,
  Pin,
  RefreshCw,
  Settings,
  Share2,
  ShoppingBag,
  Unlink,
  User,
  Youtube,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

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

interface StripeConnectStatus {
  connected: boolean
  connectAccountId?: string
  status: 'pending' | 'active' | 'restricted' | 'disabled' | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  detailsSubmitted: boolean
  businessType?: 'individual' | 'company'
  requirements?: {
    currentlyDue?: string[]
    eventuallyDue?: string[]
    pastDue?: string[]
    disabledReason?: string
  }
}

interface XeroMappings {
  productSales: string
  shippingIncome: string
  platformFees: string
  paymentFees: string
  bankAccount: string
}

interface XeroConnectionStatus {
  mappings: XeroMappings
  lastSyncAt: string | null
  status: 'connected' | 'needs_reauth' | 'error' | 'disconnected'
}

interface XeroAccountGroups {
  revenue: { code: string; name: string; type: string }[]
  expense: { code: string; name: string; type: string }[]
  bank: { code: string; name: string; type: string }[]
}

type TabId = 'social' | 'marketplaces' | 'payments'

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
  paymentsCount,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  socialCount: number
  marketplaceCount: number
  paymentsCount: number
}) {
  const tabs = [
    {
      id: 'social' as TabId,
      label: 'Social',
      icon: Share2,
      count: socialCount,
    },
    {
      id: 'marketplaces' as TabId,
      label: 'Marketplaces',
      icon: ShoppingBag,
      count: marketplaceCount,
    },
    {
      id: 'payments' as TabId,
      label: 'Payments',
      icon: CreditCard,
      count: paymentsCount,
    },
  ]

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              type="button"
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
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600'
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
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${platform.bgColor}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
          </div>
          {isConnected ? (
            <div className="mt-1">
              <p className="text-sm text-gray-600 truncate">
                @{account.username}
              </p>
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
            type="button"
            onClick={() => onDisconnect(account.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-red-300 hover:text-red-600"
          >
            <Unlink className="h-4 w-4" />
            Disconnect
          </button>
        ) : (
          <button
            type="button"
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
  onDisconnect,
}: {
  platform: (typeof marketplacePlatforms)[0]
  connection: MarketplaceConnectionData | null
  isLoading: boolean
  isDisconnecting: boolean
  onDisconnect: () => void
}) {
  const features = MARKETPLACE_FEATURES[platform.id]
  const isConnected = connection?.connected

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
      // eBay colorful logo
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
          <text
            x="1"
            y="17"
            fontSize="12"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            <tspan fill="#E53238">e</tspan>
            <tspan fill="#0064D2">b</tspan>
            <tspan fill="#F5AF02">a</tspan>
            <tspan fill="#86B817">y</tspan>
          </text>
        </svg>
      )
    }
    // Etsy logo
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="#F56400"
      >
        <path d="M8.559 3.891H4.729v7.618h3.652v1.176H4.729v7.437h4.013c.551 0 1.006-.181 1.365-.545.358-.363.538-.804.538-1.324v-.363h1.176v1.544c0 .803-.272 1.486-.816 2.048-.544.562-1.21.844-1.997.844H3.552V2.345h5.372c.787 0 1.453.282 1.997.845.544.562.816 1.244.816 2.047v1.545H10.56v-.363c0-.52-.18-.962-.538-1.324-.359-.364-.814-.545-1.365-.545h-.098v-.659z" />
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
                <p className="text-sm text-gray-600 truncate">
                  {connection.shopName}
                </p>
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

      {/* Actions */}
      <div className="px-5 py-4 space-y-3">
        {isConnected ? (
          <button
            type="button"
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
// Stripe Connect Card Component
// =============================================================================

function StripeConnectCard({
  status,
  isLoading,
  isCreating,
  isRedirecting,
  onCreateAccount,
  onStartOnboarding,
  onOpenDashboard,
  onRefresh,
}: {
  status: StripeConnectStatus | null
  isLoading: boolean
  isCreating: boolean
  isRedirecting: boolean
  onCreateAccount: (type: 'individual' | 'company') => void
  onStartOnboarding: () => void
  onOpenDashboard: () => void
  onRefresh: () => void
}) {
  const formatRequirement = (req: string) => {
    const mappings: Record<string, string> = {
      external_account: 'Bank account for payouts',
      'individual.dob': 'Date of birth',
      'individual.address': 'Address',
      'individual.first_name': 'First name',
      'individual.last_name': 'Last name',
      'individual.email': 'Email address',
      'individual.phone': 'Phone number',
      'individual.id_number': 'Tax file number (TFN)',
      'business_profile.url': 'Business website',
      'business_profile.mcc': 'Business category',
      tos_acceptance: 'Accept terms of service',
    }
    return mappings[req] || req.replace(/_/g, ' ').replace(/\./g, ' - ')
  }

  const StatusBadge = ({ statusVal }: { statusVal: string | null }) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      restricted: 'bg-orange-100 text-orange-800 border-orange-200',
      disabled: 'bg-red-100 text-red-800 border-red-200',
    }
    const labels = {
      active: 'Active',
      pending: 'Pending Verification',
      restricted: 'Restricted',
      disabled: 'Disabled',
    }
    const style = styles[statusVal as keyof typeof styles] || styles.pending
    const label = labels[statusVal as keyof typeof labels] || 'Unknown'
    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${style}`}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Stripe Connect</h3>
            <p className="text-sm text-gray-500">
              Receive payments from customers
            </p>
          </div>
          {status?.connected && <StatusBadge statusVal={status.status} />}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !status?.connected ? (
          <div className="space-y-6">
            <p className="text-gray-600">
              To receive payments from customers, connect a Stripe account.
              Stripe handles all payment processing securely.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onCreateAccount('individual')}
                disabled={isCreating}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                <User className="h-8 w-8 text-gray-600" />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">
                    Individual / Sole Trader
                  </p>
                  <p className="text-sm text-gray-500">For solo makers</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onCreateAccount('company')}
                disabled={isCreating}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                <Building2 className="h-8 w-8 text-gray-600" />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">
                    Company / Business
                  </p>
                  <p className="text-sm text-gray-500">
                    For registered businesses
                  </p>
                </div>
              </button>
            </div>

            {isCreating && (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Setting up your account...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onRefresh}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Capabilities */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                {status.chargesEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Accept Payments</p>
                  <p className="text-sm text-gray-500">
                    {status.chargesEnabled ? 'Enabled' : 'Pending verification'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                {status.payoutsEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Receive Payouts</p>
                  <p className="text-sm text-gray-500">
                    {status.payoutsEnabled ? 'Enabled' : 'Pending verification'}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {status.requirements?.currentlyDue &&
              status.requirements.currentlyDue.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="font-medium text-yellow-800 mb-2">
                    Action Required
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {status.requirements.currentlyDue.slice(0, 5).map((req) => (
                      <li key={req}>{formatRequirement(req)}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!status.onboardingComplete && (
                <button
                  type="button"
                  onClick={onStartOnboarding}
                  disabled={isRedirecting}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {isRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Continue Setup
                </button>
              )}

              {status.onboardingComplete && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  disabled={isRedirecting}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {isRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Open Stripe Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Xero Card Component
// =============================================================================

function XeroCard({
  connection,
  accounts,
  isLoading,
  isSyncing,
  isSaving,
  mappings,
  onMappingsChange,
  onConnect,
  onDisconnect,
  onSync,
  onSaveMappings,
}: {
  connection: XeroConnectionStatus | null
  accounts: XeroAccountGroups | null
  isLoading: boolean
  isSyncing: boolean
  isSaving: boolean
  mappings: XeroMappings
  onMappingsChange: (mappings: XeroMappings) => void
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
  onSaveMappings: () => void
}) {
  const isConnected = connection && connection.status !== 'disconnected'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#13B5EA]">
            <span className="text-white font-bold text-xl">X</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Xero</h3>
            <p className="text-sm text-gray-500">
              Sync transactions to accounting
            </p>
          </div>
          {isConnected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              <CheckCircle className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !isConnected ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect Xero to automatically sync your sales and expenses for
              easy bookkeeping.
            </p>
            <a
              href="/api/xero/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-[#13B5EA] px-4 py-2 text-white font-medium hover:bg-[#0ea5d3]"
            >
              <Link2 className="h-4 w-4" />
              Connect Xero
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div>
                {connection.lastSyncAt && (
                  <p className="text-sm text-gray-500">
                    Last synced:{' '}
                    {new Date(connection.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            </div>

            {/* Account Mappings */}
            {accounts && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium text-gray-900">
                    Account Mappings
                  </h4>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Sales
                    </label>
                    <select
                      value={mappings.productSales}
                      onChange={(e) =>
                        onMappingsChange({
                          ...mappings,
                          productSales: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#13B5EA] focus:border-transparent"
                    >
                      <option value="">Select account...</option>
                      {accounts.revenue.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Income
                    </label>
                    <select
                      value={mappings.shippingIncome}
                      onChange={(e) =>
                        onMappingsChange({
                          ...mappings,
                          shippingIncome: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#13B5EA] focus:border-transparent"
                    >
                      <option value="">Select account...</option>
                      {accounts.revenue.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Fees
                    </label>
                    <select
                      value={mappings.platformFees}
                      onChange={(e) =>
                        onMappingsChange({
                          ...mappings,
                          platformFees: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#13B5EA] focus:border-transparent"
                    >
                      <option value="">Select account...</option>
                      {accounts.expense.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Fees
                    </label>
                    <select
                      value={mappings.paymentFees}
                      onChange={(e) =>
                        onMappingsChange({
                          ...mappings,
                          paymentFees: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#13B5EA] focus:border-transparent"
                    >
                      <option value="">Select account...</option>
                      {accounts.expense.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account
                    </label>
                    <select
                      value={mappings.bankAccount}
                      onChange={(e) =>
                        onMappingsChange({
                          ...mappings,
                          bankAccount: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#13B5EA] focus:border-transparent"
                    >
                      <option value="">Select account...</option>
                      {accounts.bank.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSaveMappings}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save Mappings
                </button>
              </div>
            )}
          </div>
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
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  )

  // Marketplace state
  const [ebayConnection, setEbayConnection] =
    useState<MarketplaceConnectionData | null>(null)
  const [etsyConnection, setEtsyConnection] =
    useState<MarketplaceConnectionData | null>(null)
  const [marketplaceLoading, setMarketplaceLoading] = useState({
    ebay: true,
    etsy: true,
  })
  const [disconnectingPlatform, setDisconnectingPlatform] =
    useState<MarketplacePlatform | null>(null)

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(
    null,
  )
  const [stripeLoading, setStripeLoading] = useState(true)
  const [stripeCreating, setStripeCreating] = useState(false)
  const [stripeRedirecting, setStripeRedirecting] = useState(false)

  // Xero state
  const [xeroConnection, setXeroConnection] =
    useState<XeroConnectionStatus | null>(null)
  const [xeroAccounts, setXeroAccounts] = useState<XeroAccountGroups | null>(
    null,
  )
  const [xeroLoading, setXeroLoading] = useState(true)
  const [xeroSyncing, setXeroSyncing] = useState(false)
  const [xeroSaving, setXeroSaving] = useState(false)
  const [xeroMappings, setXeroMappings] = useState({
    productSales: '',
    shippingIncome: '',
    platformFees: '',
    paymentFees: '',
    bankAccount: '',
  })

  // Messages
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Handle URL params for OAuth callbacks
  useEffect(() => {
    const success = searchParams?.get('success')
    const error = searchParams?.get('error')
    const tab = searchParams?.get('tab')
    const connected = searchParams?.get('connected')
    const onboarding = searchParams?.get('onboarding')

    if (tab === 'marketplaces') setActiveTab('marketplaces')
    if (tab === 'payments') setActiveTab('payments')

    if (success) {
      if (success === 'ebay' || success === 'etsy') {
        setMessage({
          type: 'success',
          text: `Successfully connected to ${MARKETPLACE_LABELS[success as MarketplacePlatform]}!`,
        })
        setActiveTab('marketplaces')
      } else {
        setMessage({
          type: 'success',
          text: 'Successfully connected! Your account should appear below.',
        })
      }
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (connected === 'xero') {
      setMessage({ type: 'success', text: 'Successfully connected to Xero!' })
      setActiveTab('payments')
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (onboarding === 'complete') {
      setMessage({
        type: 'success',
        text: "Stripe onboarding step completed! We're verifying your details.",
      })
      setActiveTab('payments')
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

  // Fetch Stripe status
  const fetchStripeStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect')
      if (res.ok) {
        setStripeStatus(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch Stripe status:', error)
    } finally {
      setStripeLoading(false)
    }
  }, [])

  // Fetch Xero status
  const fetchXeroStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/xero/mappings')
      if (res.ok) {
        const data = await res.json()
        setXeroConnection(data)
        setXeroMappings(data.mappings)
        // Load accounts if connected
        const accountsRes = await fetch('/api/xero/accounts')
        if (accountsRes.ok) {
          setXeroAccounts(await accountsRes.json())
        }
      }
    } catch (_error) {
      // Not connected
    } finally {
      setXeroLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSocialConnections()
    fetchEbayStatus()
    fetchEtsyStatus()
    fetchStripeStatus()
    fetchXeroStatus()
  }, [
    fetchSocialConnections,
    fetchEbayStatus,
    fetchEtsyStatus,
    fetchStripeStatus,
    fetchXeroStatus,
  ])

  // Connect social platform
  async function handleSocialConnect(platform: string) {
    setConnectingPlatform(platform)
    try {
      const response = await fetch(`/api/social/connect/${platform}`, {
        method: 'POST',
      })
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
  async function handleSocialDisconnect(
    accountId: string,
    platformName: string,
  ) {
    if (!confirm(`Are you sure you want to disconnect from ${platformName}?`))
      return
    try {
      const response = await fetch(`/api/late/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchSocialConnections()
        setMessage({
          type: 'success',
          text: `Disconnected from ${platformName}`,
        })
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to disconnect',
      })
    }
  }

  // Disconnect marketplace
  async function handleMarketplaceDisconnect(platform: MarketplacePlatform) {
    if (
      !confirm(
        `Are you sure you want to disconnect from ${MARKETPLACE_LABELS[platform]}?`,
      )
    )
      return
    setDisconnectingPlatform(platform)
    try {
      const res = await fetch(`/api/marketplace/${platform}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Disconnected from ${MARKETPLACE_LABELS[platform]}`,
        })
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
      setMessage({
        type: 'error',
        text: error.message || 'Failed to disconnect',
      })
    } finally {
      setDisconnectingPlatform(null)
    }
  }

  // Stripe handlers
  async function handleStripeCreateAccount(
    businessType: 'individual' | 'company',
  ) {
    setStripeCreating(true)
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType }),
      })
      if (response.ok) {
        await fetchStripeStatus()
        handleStripeStartOnboarding()
      } else {
        const data = await response.json()
        setMessage({
          type: 'error',
          text: data.error || 'Failed to create account',
        })
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to create account' })
    } finally {
      setStripeCreating(false)
    }
  }

  async function handleStripeStartOnboarding() {
    setStripeRedirecting(true)
    try {
      const response = await fetch('/api/stripe/connect/onboarding', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      } else {
        const data = await response.json()
        setMessage({
          type: 'error',
          text: data.error || 'Failed to start onboarding',
        })
        setStripeRedirecting(false)
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to start onboarding' })
      setStripeRedirecting(false)
    }
  }

  async function handleStripeOpenDashboard() {
    setStripeRedirecting(true)
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        window.open(data.url, '_blank')
      } else {
        const data = await response.json()
        setMessage({
          type: 'error',
          text: data.error || 'Failed to open dashboard',
        })
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Failed to open dashboard' })
    } finally {
      setStripeRedirecting(false)
    }
  }

  // Xero handlers
  async function handleXeroDisconnect() {
    if (!confirm('Disconnect Xero? This will stop syncing transactions.'))
      return
    await fetch('/api/xero/disconnect', { method: 'POST' })
    setXeroConnection(null)
    setXeroAccounts(null)
    setMessage({ type: 'success', text: 'Disconnected from Xero' })
  }

  async function handleXeroSync() {
    setXeroSyncing(true)
    try {
      await fetch('/api/xero/sync', { method: 'POST' })
      await fetchXeroStatus()
      setMessage({ type: 'success', text: 'Xero sync completed' })
    } finally {
      setXeroSyncing(false)
    }
  }

  async function handleXeroSaveMappings() {
    setXeroSaving(true)
    try {
      const res = await fetch('/api/xero/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xeroMappings),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Xero mappings saved' })
      }
    } finally {
      setXeroSaving(false)
    }
  }

  // Count connected
  const socialConnectedCount = socialAccounts.filter((a) => a.isActive).length
  const marketplaceConnectedCount =
    (ebayConnection?.connected ? 1 : 0) + (etsyConnection?.connected ? 1 : 0)
  const paymentsConnectedCount =
    (stripeStatus?.connected ? 1 : 0) +
    (xeroConnection && xeroConnection.status !== 'disconnected' ? 1 : 0)

  // Get account by platform
  const getAccountByPlatform = (platform: string) =>
    socialAccounts.find((acc) => acc.platform === platform && acc.isActive)

  // Refresh all
  const handleRefresh = () => {
    setSocialLoading(true)
    setMarketplaceLoading({ ebay: true, etsy: true })
    setStripeLoading(true)
    setXeroLoading(true)
    fetchSocialConnections()
    fetchEbayStatus()
    fetchEtsyStatus()
    fetchStripeStatus()
    fetchXeroStatus()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="mt-1 text-gray-500">
            Connect your accounts to publish content, sync inventory, and
            receive payments
          </p>
        </div>
        <button
          type="button"
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
        paymentsCount={paymentsConnectedCount}
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
                      onDisconnect={(accountId) =>
                        handleSocialDisconnect(accountId, platform.name)
                      }
                    />
                  ))}
                </div>

                {/* Info box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">
                    About Social Connections
                  </h3>
                  <ul className="space-y-1.5 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <span>
                        Publish products directly to your connected accounts
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <span>
                        AI-generated captions tailored to each platform
                      </span>
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
                  connection={
                    platform.id === 'ebay' ? ebayConnection : etsyConnection
                  }
                  isLoading={marketplaceLoading[platform.id]}
                  isDisconnecting={disconnectingPlatform === platform.id}
                  onDisconnect={() => handleMarketplaceDisconnect(platform.id)}
                />
              ))}
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">
                About Marketplace Sync
              </h3>
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

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <StripeConnectCard
                status={stripeStatus}
                isLoading={stripeLoading}
                isCreating={stripeCreating}
                isRedirecting={stripeRedirecting}
                onCreateAccount={handleStripeCreateAccount}
                onStartOnboarding={handleStripeStartOnboarding}
                onOpenDashboard={handleStripeOpenDashboard}
                onRefresh={fetchStripeStatus}
              />

              <XeroCard
                connection={xeroConnection}
                accounts={xeroAccounts}
                isLoading={xeroLoading}
                isSyncing={xeroSyncing}
                isSaving={xeroSaving}
                mappings={xeroMappings}
                onMappingsChange={setXeroMappings}
                onConnect={() => (window.location.href = '/api/xero/connect')}
                onDisconnect={handleXeroDisconnect}
                onSync={handleXeroSync}
                onSaveMappings={handleXeroSaveMappings}
              />
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">
                About Payment & Accounting
              </h3>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>
                    MadeBuy charges 0% platform fees - you keep more earnings
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>
                    Stripe processing: 1.7% + $0.30 for Australian cards
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>
                    Automatic transaction sync to Xero for easy bookkeeping
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
