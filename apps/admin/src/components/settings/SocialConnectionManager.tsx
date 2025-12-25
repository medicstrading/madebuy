'use client'

import { useState } from 'react'
import type { Tenant, SocialPlatform, SocialConnection } from '@madebuy/shared'
import { Instagram, Facebook, Youtube } from 'lucide-react'

interface SocialConnectionManagerProps {
  tenant: Tenant
}

const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-100 text-pink-600',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-100 text-blue-600',
  },
  tiktok: {
    name: 'TikTok',
    icon: ({ className }: { className?: string }) => <span className="text-2xl">🎵</span>,
    color: 'bg-black text-white',
  },
  pinterest: {
    name: 'Pinterest',
    icon: ({ className }: { className?: string }) => <span className="text-2xl">📌</span>,
    color: 'bg-red-100 text-red-600',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-100 text-red-600',
  },
}

export function SocialConnectionManager({ tenant }: SocialConnectionManagerProps) {
  const [connections, setConnections] = useState<SocialConnection[]>(
    tenant.socialConnections || []
  )
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null)

  const handleConnect = async (platform: SocialPlatform) => {
    setConnecting(platform)

    try {
      // Get OAuth URL from API
      const response = await fetch(`/api/social/connect/${platform}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to initiate connection')
      }

      const { authUrl } = await response.json()

      // Redirect to OAuth provider
      window.location.href = authUrl
    } catch (error) {
      console.error('Connection error:', error)
      alert('Failed to connect. Please try again.')
      setConnecting(null)
    }
  }

  const handleDisconnect = async (platform: SocialPlatform) => {
    if (!confirm(`Are you sure you want to disconnect ${platformConfig[platform].name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/social/disconnect/${platform}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      // Remove from local state
      setConnections(prev => prev.filter(c => c.platform !== platform))
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('Failed to disconnect. Please try again.')
    }
  }

  const isConnected = (platform: SocialPlatform): SocialConnection | undefined => {
    return connections.find(c => c.platform === platform && c.isActive)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(platformConfig).map(([platform, config]) => {
        const connection = isConnected(platform as SocialPlatform)
        const Icon = config.icon

        return (
          <div
            key={platform}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{config.name}</h3>
                {connection && (
                  <p className="text-sm text-gray-600">
                    {connection.accountName || 'Connected'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              {connection ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-600"></span>
                    Connected
                  </div>
                  <button
                    onClick={() => handleDisconnect(platform as SocialPlatform)}
                    className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(platform as SocialPlatform)}
                  disabled={connecting === platform}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connecting === platform ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
