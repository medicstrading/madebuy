'use client'

import { useEffect, useState } from 'react'
import type { Tenant, SocialPlatform } from '@madebuy/shared'
import { Instagram, Facebook, Youtube, CheckCircle, Loader2, AlertCircle, Music, Pin } from 'lucide-react'

interface SocialConnectionManagerProps {
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

interface ConnectionStatus {
  loading: boolean
  accounts: LateAccount[]
  error?: string
}

const platformConfig: Record<string, {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  gradient: string
}> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
    gradient: 'from-purple-600 via-pink-600 to-orange-500',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
    gradient: 'from-blue-600 to-blue-700',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-black',
    bgColor: 'bg-black',
    gradient: 'from-gray-900 to-black',
  },
  pinterest: {
    name: 'Pinterest',
    icon: Pin,
    color: 'text-red-600',
    bgColor: 'bg-red-600',
    gradient: 'from-red-600 to-red-700',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-600',
    bgColor: 'bg-red-600',
    gradient: 'from-red-600 to-red-700',
  },
}

export function SocialConnectionManager({ tenant }: SocialConnectionManagerProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    loading: true,
    accounts: [],
  })
  const [connecting, setConnecting] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success) {
      setSuccessMessage('Successfully connected! Your account should appear below.')
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (error) {
      setStatus(prev => ({ ...prev, error: decodeURIComponent(error) }))
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
    }

    fetchConnections()
  }, [])

  async function fetchConnections() {
    try {
      setStatus(prev => ({ ...prev, loading: true }))

      const response = await fetch('/api/late/accounts')
      const data = await response.json()

      if (response.ok) {
        setStatus({
          loading: false,
          accounts: data.accounts || [],
          error: undefined,
        })
      } else {
        setStatus({
          loading: false,
          accounts: [],
          error: data.error || 'Failed to fetch connections',
        })
      }
    } catch (error: any) {
      console.error('Error fetching connections:', error)
      setStatus({
        loading: false,
        accounts: [],
        error: error.message,
      })
    }
  }

  async function handleConnect(platform: string) {
    setConnecting(platform)

    try {
      // Get OAuth URL from API
      const response = await fetch(`/api/social/connect/${platform}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Late OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to get authorization URL')
      }
    } catch (error: any) {
      console.error('Error connecting:', error)
      setStatus(prev => ({
        ...prev,
        error: error.message || 'Failed to connect',
      }))
      setConnecting(null)
    }
  }

  async function handleDisconnect(accountId: string, platformName: string) {
    if (!confirm(`Are you sure you want to disconnect from ${platformName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/late/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh connections
        await fetchConnections()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error)
      setStatus(prev => ({
        ...prev,
        error: error.message || 'Failed to disconnect',
      }))
    }
  }

  const getAccountByPlatform = (platform: string): LateAccount | undefined => {
    return status.accounts.find(acc => acc.platform === platform && acc.isActive)
  }

  if (status.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Success!</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {status.error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Connection Error</p>
            <p>{status.error}</p>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(platformConfig).map(([platform, config]) => {
          const account = getAccountByPlatform(platform)
          const Icon = config.icon
          const isConnecting = connecting === platform

          return (
            <div
              key={platform}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  {account ? (
                    <>
                      <p className="text-sm text-gray-600">@{account.username}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
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

              <div className="mt-4">
                {account ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDisconnect(account.id, config.name)}
                      className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={isConnecting}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${config.gradient} px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Icon className="h-4 w-4" />
                        Connect {config.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Connected Accounts Summary */}
      {status.accounts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 font-semibold text-gray-900">
            Connected Accounts ({status.accounts.length})
          </h3>
          <div className="space-y-3">
            {status.accounts.map((account) => {
              const config = platformConfig[account.platform]
              const Icon = config?.icon || CheckCircle

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  {account.profileImage ? (
                    <img
                      src={account.profileImage}
                      alt={account.displayName}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config?.bgColor || 'bg-gray-400'}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{account.displayName}</p>
                    <p className="text-sm text-gray-600">
                      @{account.username} · {config?.name || account.platform}
                    </p>
                  </div>
                  {account.isActive && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-3 font-semibold text-blue-900">About Social Connections</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>Connect your social accounts to publish products directly</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>AI-generated captions tailored to each platform</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>Schedule posts for optimal engagement times</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>Track performance across all channels</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
