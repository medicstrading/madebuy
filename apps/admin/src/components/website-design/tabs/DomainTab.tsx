'use client'

import type { DomainStatus, Tenant } from '@madebuy/shared'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { DnsInstructions } from '@/components/domain/DnsInstructions'
import { DomainStatusBadge } from '@/components/domain/DomainStatusBadge'

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

const CLOUDFLARE_TOKEN_URL =
  'https://dash.cloudflare.com/profile/api-tokens/create?name=MadeBuy%20DNS%20Access&type=custom&permissionGroups=%5B%7B%22key%22%3A%22zone_dns_write%22%7D%2C%7B%22key%22%3A%22zone_zone_read%22%7D%5D'

type DomainChoice = 'subdomain' | 'custom'

export function DomainTab({ tenant }: DomainTabProps) {
  const [domainData, setDomainData] = useState<DomainData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [selectedChoice, setSelectedChoice] =
    useState<DomainChoice>('subdomain')

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
        if (data.domain) {
          setSelectedChoice('custom')
        }
      }

      if (cfRes.ok) {
        const data = await cfRes.json()
        setCloudflareConnected(data.connected || false)
        if (data.connected) {
          loadCloudflareZones()
        }
      }
    } catch {
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
  }, [loadData])

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
        setSuccess('Cloudflare connected! Select a domain below.')
        await loadCloudflareZones()
      } else {
        setError(data.error || 'Failed to connect Cloudflare account')
      }
    } catch {
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
    } catch {
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

    const zone = cloudflareZones.find((z) => z.id === selectedZone)
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
    } catch {
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
    } catch {
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
        setError(
          data.message ||
            'DNS not configured yet. Changes can take up to 48 hours.',
        )
      }
    } catch {
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
        setSelectedChoice('subdomain')
        await loadData()
      } else {
        setError('Failed to remove domain')
      }
    } catch {
      setError('Failed to remove domain')
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = tenant?.slug ? `${webBaseUrl}/${tenant.slug}` : '#'
  const customDomainUrl = domainData?.domain
    ? `https://${domainData.domain}`
    : null
  const hasCustomDomainFeature = domainData?.hasCustomDomainFeature ?? false
  const isCustomDomainLocked = !hasCustomDomainFeature

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Choose Your Store Address
        </h2>
        <p className="mt-2 text-gray-500">How will customers find your shop?</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-emerald-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Domain Choice Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Option 1: MadeBuy Subdomain */}
        <button
          type="button"
          type="button"
          onClick={() => setSelectedChoice('subdomain')}
          className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
            selectedChoice === 'subdomain'
              ? 'border-amber-400 bg-amber-50/50 shadow-lg shadow-amber-100/50 scale-[1.02]'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
          }`}
        >
          {/* Selection indicator */}
          <div
            className={`absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              selectedChoice === 'subdomain'
                ? 'bg-amber-500 scale-100'
                : 'bg-gray-200 scale-0'
            }`}
          >
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>

          {/* Card content */}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                selectedChoice === 'subdomain'
                  ? 'bg-amber-100'
                  : 'bg-gray-100 group-hover:bg-gray-200'
              }`}
            >
              <Link2
                className={`h-7 w-7 transition-colors ${
                  selectedChoice === 'subdomain'
                    ? 'text-amber-600'
                    : 'text-gray-500'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  MadeBuy URL
                </h3>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Free
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Instant access, no setup needed
              </p>
            </div>
          </div>

          {/* URL preview */}
          <div
            className={`mt-2 rounded-xl border px-4 py-3 transition-colors ${
              selectedChoice === 'subdomain'
                ? 'border-amber-200 bg-white'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            <code className="text-sm text-gray-700 break-all font-medium">
              {storefrontUrl}
            </code>
          </div>
        </button>

        {/* Option 2: Custom Domain */}
        {isCustomDomainLocked ? (
          /* Locked state */
          <div className="relative rounded-2xl border-2 border-gray-200 bg-gray-50/80 p-6 text-left">
            {/* Lock overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

            {/* Lock badge */}
            <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-gray-700 pl-2 pr-3 py-1 shadow-lg">
              <Lock className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-xs font-semibold text-white">
                Maker Plan
              </span>
            </div>

            {/* Card content */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-200/80">
                <Globe className="h-7 w-7 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-400">
                    Custom Domain
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Use your own domain name
                </p>
              </div>
            </div>

            {/* URL preview */}
            <div className="mt-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-3">
              <code className="text-sm text-gray-400 font-medium">
                www.yourstore.com
              </code>
            </div>

            {/* Upgrade CTA */}
            <div className="mt-5 pt-5 border-t border-gray-200">
              <a
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm text-white font-semibold hover:bg-gray-800 transition-colors group"
              >
                Upgrade to Maker
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <p className="mt-2 text-xs text-gray-400">
                Starting at $15/month
              </p>
            </div>
          </div>
        ) : (
          /* Unlocked state */
          <button
            type="button"
            type="button"
            onClick={() => setSelectedChoice('custom')}
            className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
              selectedChoice === 'custom'
                ? 'border-emerald-400 bg-emerald-50/50 shadow-lg shadow-emerald-100/50 scale-[1.02]'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
            }`}
          >
            {/* Selection indicator */}
            <div
              className={`absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
                selectedChoice === 'custom'
                  ? 'bg-emerald-500 scale-100'
                  : 'bg-gray-200 scale-0'
              }`}
            >
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            </div>

            {/* Status badge when configured but not selected */}
            {domainData?.domain && selectedChoice !== 'custom' && (
              <div className="absolute top-4 right-4">
                <DomainStatusBadge status={domainData.status} />
              </div>
            )}

            {/* Card content */}
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                  selectedChoice === 'custom'
                    ? 'bg-emerald-100'
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}
              >
                <Globe
                  className={`h-7 w-7 transition-colors ${
                    selectedChoice === 'custom'
                      ? 'text-emerald-600'
                      : 'text-gray-500'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Custom Domain
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Included
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Professional brand presence
                </p>
              </div>
            </div>

            {/* URL preview */}
            <div
              className={`mt-2 rounded-xl border px-4 py-3 transition-colors ${
                selectedChoice === 'custom'
                  ? 'border-emerald-200 bg-white'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <code className="text-sm text-gray-700 font-medium">
                {domainData?.domain || 'www.yourstore.com'}
              </code>
            </div>
          </button>
        )}
      </div>

      {/* Subdomain selected - confirmation */}
      {selectedChoice === 'subdomain' && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                You&apos;re all set!
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Your store is live and ready for customers.
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3">
                <code className="text-sm font-semibold text-gray-900 flex-1 break-all">
                  {storefrontUrl}
                </code>
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white font-medium hover:bg-amber-600 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom domain selected - setup panel */}
      {selectedChoice === 'custom' && hasCustomDomainFeature && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50/50 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Custom Domain Setup
                  </h3>
                  <p className="text-sm text-gray-500">
                    Connect your own domain
                  </p>
                </div>
              </div>
              {domainData?.domain && (
                <DomainStatusBadge status={domainData.status} />
              )}
            </div>
          </div>

          <div className="p-6">
            {domainData?.domain ? (
              <div className="space-y-6">
                {/* Current domain */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
                      <Globe className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <code className="text-sm font-semibold text-gray-900">
                        {domainData.domain}
                      </code>
                      {domainData.status === 'active' && customDomainUrl && (
                        <a
                          href={customDomainUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
                  </button>
                </div>

                {/* Pending verification */}
                {domainData.status === 'pending_nameservers' && (
                  <>
                    <DnsInstructions
                      domain={domainData.domain}
                      verificationToken={domainData.verificationToken}
                    />
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Check DNS Configuration
                    </button>
                  </>
                )}

                {/* Active */}
                {domainData.status === 'active' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">
                          Domain is live!
                        </p>
                        <p className="text-sm text-emerald-700">
                          Customers can now visit{' '}
                          <a
                            href={customDomainUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            {domainData.domain}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Backup URL notice */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Backup:</span>{' '}
                    Your MadeBuy URL{' '}
                    <code className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium">
                      {storefrontUrl}
                    </code>{' '}
                    always works as a fallback.
                  </p>
                </div>
              </div>
            ) : (
              /* No domain configured - setup form */
              <div className="space-y-6">
                <form onSubmit={handleSetDomain} className="space-y-4">
                  <div>
                    <label
                      htmlFor="domain"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Your domain name
                    </label>
                    <input
                      type="text"
                      id="domain"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="myshop.com.au"
                      className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Enter without http:// or www
                    </p>
                  </div>

                  <button
                    type="button"
                    type="submit"
                    disabled={isSaving || !newDomain.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Connect Domain
                  </button>
                </form>

                {/* How it works */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">
                    How it works
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 flex-shrink-0">
                        1
                      </span>
                      <span>Enter your domain above</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 flex-shrink-0">
                        2
                      </span>
                      <span>
                        Add 2 DNS records at your registrar (GoDaddy, Namecheap,
                        etc.)
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 flex-shrink-0">
                        3
                      </span>
                      <span>
                        Click &quot;Check DNS&quot; — usually takes 15 min to 48
                        hours
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Cloudflare integration */}
                <div className="border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    type="button"
                    onClick={() =>
                      setShowCloudflareSection(!showCloudflareSection)
                    }
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 group-hover:bg-orange-200 transition-colors">
                        <Cloud className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          Using Cloudflare?
                        </h4>
                        <p className="text-xs text-gray-500">
                          Skip manual DNS — auto-configure in one click
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cloudflareConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                      <div
                        className={`transition-transform duration-200 ${showCloudflareSection ? 'rotate-180' : ''}`}
                      >
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </button>

                  {showCloudflareSection && (
                    <div className="mt-4 ml-13 pl-10 animate-in fade-in slide-in-from-top-2 duration-200">
                      {cloudflareConnected ? (
                        <div className="space-y-4">
                          {cloudflareZones.length > 0 ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select your domain
                                </label>
                                <select
                                  value={selectedZone}
                                  onChange={(e) =>
                                    setSelectedZone(e.target.value)
                                  }
                                  className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                >
                                  <option value="">Choose a domain...</option>
                                  {cloudflareZones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                      {zone.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                type="button"
                                onClick={handleAutoConfigureDns}
                                disabled={!selectedZone || isConfiguring}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                              >
                                {isConfiguring ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Zap className="h-4 w-4" />
                                )}
                                Auto-Configure DNS
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No domains found in your Cloudflare account.
                            </p>
                          )}

                          <button
                            type="button"
                            type="button"
                            onClick={handleDisconnectCloudflare}
                            disabled={cloudflareLoading}
                            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                          >
                            Disconnect Cloudflare
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <p className="text-sm text-orange-800">
                              If your domain is managed by Cloudflare, we can
                              set up DNS records automatically.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <a
                              href={CLOUDFLARE_TOKEN_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm text-orange-700 font-semibold hover:bg-orange-50 transition-colors"
                            >
                              <Cloud className="h-4 w-4" />
                              Create API Token
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            <form
                              onSubmit={handleConnectCloudflare}
                              className="space-y-3"
                            >
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Paste your API token
                                </label>
                                <input
                                  type="password"
                                  value={cloudflareToken}
                                  onChange={(e) =>
                                    setCloudflareToken(e.target.value)
                                  }
                                  placeholder="Your Cloudflare API token"
                                  className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                />
                              </div>

                              <button
                                type="button"
                                type="submit"
                                disabled={
                                  cloudflareLoading || !cloudflareToken.trim()
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                              >
                                {cloudflareLoading && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Connect Cloudflare
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coming soon: Managed Domains */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50/50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 mb-4">
          <Sparkles className="h-7 w-7 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Managed Domains
        </h3>
        <p className="text-gray-500 max-w-md mx-auto mb-4">
          Soon you&apos;ll be able to search, purchase, and connect a domain
          without leaving MadeBuy. We&apos;ll handle all the technical setup.
        </p>
        <span className="inline-flex items-center rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">
          Coming Soon
        </span>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Good to know
        </h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            DNS changes typically take 15 minutes, but can take up to 48 hours
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            SSL certificates are configured automatically — no extra steps
            needed
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            Your MadeBuy URL always works as a backup
          </li>
        </ul>
      </div>
    </div>
  )
}
