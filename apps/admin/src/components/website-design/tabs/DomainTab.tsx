'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Link2,
  Trash2,
  RefreshCw,
  Crown,
  Cloud,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2,
} from 'lucide-react'
import { DnsInstructions } from '@/components/domain/DnsInstructions'
import { DomainStatusBadge } from '@/components/domain/DomainStatusBadge'
import type { DomainStatus, Tenant } from '@madebuy/shared'

interface DomainData {
  domain: string | null
  status: DomainStatus
  verificationToken: string
  hasCustomDomainFeature: boolean
  setupInstructions: {
    cname: { type: string; host: string; value: string }
    txt: { type: string; host: string; value: string }
  }
}

interface CloudflareZone {
  id: string
  name: string
  status: string
  nameservers: string[]
}

interface DomainTabProps {
  tenant: Tenant | null
}

// Pre-filled Cloudflare token URL - takes user directly to token creation with correct permissions
const CLOUDFLARE_TOKEN_URL = 'https://dash.cloudflare.com/profile/api-tokens/create?name=MadeBuy%20DNS%20Access&type=custom&permissionGroups=%5B%7B%22key%22%3A%22zone_dns_write%22%7D%2C%7B%22key%22%3A%22zone_zone_read%22%7D%5D'

export function DomainTab({ tenant }: DomainTabProps) {
  const [domainData, setDomainData] = useState<DomainData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')

  // Cloudflare state
  const [cloudflareConnected, setCloudflareConnected] = useState(false)
  const [cloudflareLoading, setCloudflareLoading] = useState(false)
  const [cloudflareToken, setCloudflareToken] = useState('')
  const [cloudflareZones, setCloudflareZones] = useState<CloudflareZone[]>([])
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [showCloudflareSection, setShowCloudflareSection] = useState(false)

  const loadData = async () => {
    try {
      const [domainRes, cfRes] = await Promise.all([
        fetch('/api/domain'),
        fetch('/api/cloudflare/connect'),
      ])

      if (domainRes.ok) {
        const data = await domainRes.json()
        setDomainData(data)
      }

      if (cfRes.ok) {
        const data = await cfRes.json()
        setCloudflareConnected(data.connected || false)
        if (data.connected) {
          setShowCloudflareSection(true)
          loadCloudflareZones()
        }
      }
    } catch (err) {
      setError('Failed to load domain settings')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCloudflareZones = async () => {
    try {
      const res = await fetch('/api/cloudflare/zones')
      if (res.ok) {
        const data = await res.json()
        setCloudflareZones(data.zones || [])
      }
    } catch (err) {
      console.error('Failed to load zones:', err)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnectCloudflare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloudflareToken.trim()) return

    setCloudflareLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/cloudflare/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: cloudflareToken.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.connected) {
        setCloudflareConnected(true)
        setCloudflareToken('')
        setSuccess('Cloudflare connected! Select a domain below to auto-configure DNS.')
        await loadCloudflareZones()
      } else {
        setError(data.error || 'Failed to connect Cloudflare account')
      }
    } catch (err) {
      setError('Failed to connect Cloudflare account')
    } finally {
      setCloudflareLoading(false)
    }
  }

  const handleDisconnectCloudflare = async () => {
    if (!confirm('Disconnect Cloudflare? You can reconnect anytime.')) return

    setCloudflareLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/cloudflare/connect', { method: 'DELETE' })
      if (res.ok) {
        setCloudflareConnected(false)
        setCloudflareZones([])
        setSuccess('Cloudflare disconnected')
      }
    } catch (err) {
      setError('Failed to disconnect')
    } finally {
      setCloudflareLoading(false)
    }
  }

  const handleAutoConfigureDns = async () => {
    if (!selectedZone) {
      setError('Please select a domain first')
      return
    }

    const zone = cloudflareZones.find(z => z.id === selectedZone)
    if (!zone) return

    setIsConfiguring(true)
    setError(null)

    try {
      const res = await fetch('/api/cloudflare/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: zone.name, zoneId: zone.id }),
      })

      const data = await res.json()

      if (res.ok && data.configured) {
        setSuccess(`Done! ${zone.name} is now connected to your store.`)
        await loadData()
      } else {
        setError(data.message || 'Failed to configure DNS')
      }
    } catch (err) {
      setError('Failed to configure DNS')
    } finally {
      setIsConfiguring(false)
    }
  }

  const handleSetDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok) {
        setDomainData(data)
        setSuccess('Domain saved! Follow the DNS instructions below.')
        setNewDomain('')
      } else {
        setError(data.error || 'Failed to save domain')
      }
    } catch (err) {
      setError('Failed to save domain')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/domain/verify', { method: 'POST' })
      const data = await response.json()

      if (response.ok && data.verified) {
        setSuccess('Domain verified! Your store is now live.')
        await loadData()
      } else {
        setError(data.message || 'DNS not configured yet. Changes can take up to 48 hours.')
      }
    } catch (err) {
      setError('Failed to verify domain')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove this domain from your store?')) return

    setIsRemoving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/domain', { method: 'DELETE' })

      if (response.ok) {
        setSuccess('Domain removed')
        await loadData()
      } else {
        setError('Failed to remove domain')
      }
    } catch (err) {
      setError('Failed to remove domain')
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = tenant?.slug ? `${webBaseUrl}/${tenant.slug}` : '#'
  const customDomainUrl = domainData?.domain ? `https://${domainData.domain}` : null

  return (
    <div className="space-y-8">
      {/* Intro Section */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 mb-4">
          <Globe className="h-7 w-7 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Your Domain</h2>
        <p className="text-gray-600">
          Give your store a professional look with your own domain name
        </p>
      </div>

      {/* Messages */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Storefront URL */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Store URL</h3>
              <p className="text-sm text-gray-500">Free subdomain included</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <code className="text-sm font-medium text-gray-900">{storefrontUrl}</code>
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              Visit
            </a>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            This URL always works, even with a custom domain.
          </p>
        </div>
      </section>

      {/* Custom Domain - PRIMARY SECTION */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Custom Domain</h3>
              <p className="text-sm text-gray-500">Use your own domain name</p>
            </div>
            {domainData?.domain && <DomainStatusBadge status={domainData.status} />}
          </div>
        </div>

        <div className="p-6">
          {!domainData?.hasCustomDomainFeature ? (
            <div className="text-center py-6">
              <Crown className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Upgrade to Pro</h4>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Custom domains are available on Pro and higher plans.
              </p>
              <a
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
              >
                View Plans
              </a>
            </div>
          ) : domainData?.domain ? (
            <div className="space-y-6">
              {/* Current domain */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <code className="text-sm font-medium text-gray-900">{domainData.domain}</code>
                  {domainData.status === 'active' && customDomainUrl && (
                    <a
                      href={customDomainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit
                    </a>
                  )}
                </div>
                <button
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove
                </button>
              </div>

              {/* Pending - show DNS instructions */}
              {domainData.status === 'pending_nameservers' && (
                <>
                  <DnsInstructions
                    domain={domainData.domain}
                    verificationToken={domainData.verificationToken}
                  />
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Check DNS
                  </button>
                </>
              )}

              {/* Active */}
              {domainData.status === 'active' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Domain active</p>
                      <p className="text-sm text-green-700">
                        Your store is live at{' '}
                        <a href={customDomainUrl!} target="_blank" rel="noopener noreferrer" className="underline">
                          {domainData.domain}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No domain - show setup form */
            <div className="space-y-6">
              <form onSubmit={handleSetDomain} className="space-y-4">
                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter your domain
                  </label>
                  <input
                    type="text"
                    id="domain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="myshop.com.au"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Without http:// or www
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || !newDomain.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Connect Domain
                </button>
              </form>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Enter your domain above</li>
                  <li>Add 2 DNS records at your registrar (GoDaddy, Namecheap, etc.)</li>
                  <li>Click &quot;Check DNS&quot; - usually takes 15 minutes to 48 hours</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cloudflare Integration - POWER USER SECTION */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowCloudflareSection(!showCloudflareSection)}
          className="w-full border-b border-gray-100 bg-gray-50 px-6 py-4 text-left hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Settings2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cloudflare Users</h3>
                <p className="text-sm text-gray-500">Auto-configure DNS if your domain is on Cloudflare</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cloudflareConnected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
              {showCloudflareSection ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </button>

        {showCloudflareSection && (
          <div className="p-6">
            {cloudflareConnected ? (
              <div className="space-y-6">
                {/* Zone selection */}
                {cloudflareZones.length > 0 && !domainData?.domain && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select a domain
                      </label>
                      <select
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                      >
                        <option value="">Choose...</option>
                        {cloudflareZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleAutoConfigureDns}
                      disabled={!selectedZone || isConfiguring}
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white font-medium hover:bg-orange-700 disabled:opacity-50"
                    >
                      {isConfiguring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Auto-Configure DNS
                    </button>
                  </div>
                )}

                {cloudflareZones.length === 0 && (
                  <p className="text-gray-500">No domains found in your Cloudflare account.</p>
                )}

                {domainData?.domain && (
                  <p className="text-gray-500">Domain already configured. Remove it above to change.</p>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleDisconnectCloudflare}
                    disabled={cloudflareLoading}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Disconnect Cloudflare
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <Zap className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-900">Skip manual DNS setup</h4>
                    <p className="text-sm text-orange-800 mt-1">
                      If your domain is already on Cloudflare, we can configure DNS automatically.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Step 1: Create an API token</h4>
                    <a
                      href={CLOUDFLARE_TOKEN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-white px-4 py-2 text-orange-700 font-medium hover:bg-orange-50"
                    >
                      <Cloud className="h-4 w-4" />
                      Open Cloudflare Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="mt-2 text-sm text-gray-500">
                      This opens Cloudflare with the right permissions pre-selected. Just click &quot;Create Token&quot; and copy it.
                    </p>
                  </div>

                  <form onSubmit={handleConnectCloudflare} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Step 2: Paste your token
                      </label>
                      <input
                        type="password"
                        value={cloudflareToken}
                        onChange={(e) => setCloudflareToken(e.target.value)}
                        placeholder="Paste API token here"
                        className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={cloudflareLoading || !cloudflareToken.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white font-medium hover:bg-orange-700 disabled:opacity-50"
                    >
                      {cloudflareLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Connect
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Managed Domains - COMING SOON */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Managed Domains</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            Don&apos;t have a domain? Soon you&apos;ll be able to search, purchase, and connect a domain
            without leaving MadeBuy. We&apos;ll handle all the technical stuff.
          </p>
          <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            Coming Soon
          </span>
        </div>
      </section>

      {/* Quick Tips */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">Quick tips</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• DNS changes usually take 15 minutes, but can take up to 48 hours</li>
          <li>• SSL certificates are set up automatically - no extra steps needed</li>
          <li>• Your MadeBuy URL always works as a backup</li>
        </ul>
      </div>
    </div>
  )
}
