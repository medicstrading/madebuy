'use client'

import {
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Mail,
  Package,
  ShoppingCart,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MetricCard } from '@/components/ui/MetricCard'
import { cn } from '@/lib/utils'

interface TenantDetail {
  id: string
  businessName: string
  email: string
  slug: string
  plan: string
  createdAt: string
  lastLoginAt?: string
  subscription?: {
    status: string
    priceAmount: number
    currentPeriodEnd?: string
  }
  features: Record<string, boolean>
  storefront?: {
    enabled: boolean
    customDomain?: string
  }
  stats: {
    productCount: number
    orderCount: number
    totalRevenue: number
    healthScore: number
  }
  recentActivity: {
    type: string
    message: string
    timestamp: string
  }[]
}

interface TenantDetailContentProps {
  tenantId: string
}

function HealthBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80)
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (score >= 50)
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  const getLabel = () => {
    if (score >= 80) return 'Healthy'
    if (score >= 50) return 'At Risk'
    return 'Churning'
  }

  const getIcon = () => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
        getColor(),
      )}
    >
      {getIcon()}
      <span>
        {score} - {getLabel()}
      </span>
    </div>
  )
}

function PlanBadge({ plan, status }: { plan: string; status?: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    maker: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    studio: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex rounded-full border px-3 py-1 text-sm font-medium capitalize',
          colors[plan.toLowerCase()] || colors.free,
        )}
      >
        {plan}
      </span>
      {status && status !== 'active' && (
        <span className="rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400 capitalize">
          {status}
        </span>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | React.ReactNode
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
      {href && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-muted/50 transition-colors rounded-lg"
      >
        {content}
      </a>
    )
  }

  return content
}

export function TenantDetailContent({ tenantId }: TenantDetailContentProps) {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const _router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)

      try {
        const res = await fetch(`/api/tenants/${tenantId}`)
        if (res.ok) {
          const json = await res.json()
          setTenant(json)
          setError(null)
        } else if (res.status === 404) {
          setError('Tenant not found')
        } else {
          setError('Failed to load tenant')
        }
      } catch (err) {
        console.error('Failed to fetch tenant:', err)
        setError('Failed to load tenant')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tenantId],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleImpersonate = async () => {
    try {
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (res.ok) {
        const { redirectUrl } = await res.json()
        window.open(redirectUrl, '_blank')
      }
    } catch (err) {
      console.error('Impersonation error:', err)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role,
              }
            : undefined
        }
      />

      <main className="ml-64 flex-1 p-8">
        <Header
          title={loading ? 'Loading...' : tenant?.businessName || 'Tenant'}
          subtitle="Tenant details and activity"
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          actions={
            <div className="flex items-center gap-3">
              <Link
                href="/tenants"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              {tenant && (
                <button
                  type="button"
                  onClick={handleImpersonate}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <UserCheck className="h-4 w-4" />
                  Impersonate
                </button>
              )}
            </div>
          }
        />

        {error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {error}
            </h3>
            <Link href="/tenants" className="text-primary hover:underline">
              Return to tenant list
            </Link>
          </div>
        ) : loading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="h-8 w-48 skeleton rounded mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 skeleton rounded" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="h-6 w-32 skeleton rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 skeleton rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          tenant && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tenant Info */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {tenant.businessName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {tenant.id}
                      </p>
                    </div>
                    <HealthBadge score={tenant.stats.healthScore} />
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    <InfoRow
                      icon={Mail}
                      label="Email"
                      value={tenant.email}
                      href={`mailto:${tenant.email}`}
                    />
                    <InfoRow
                      icon={Globe}
                      label="Slug"
                      value={tenant.slug}
                      href={`https://madebuy.com.au/${tenant.slug}`}
                    />
                    <InfoRow
                      icon={Building}
                      label="Plan"
                      value={
                        <PlanBadge
                          plan={tenant.plan}
                          status={tenant.subscription?.status}
                        />
                      }
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Joined"
                      value={new Date(tenant.createdAt).toLocaleDateString()}
                    />
                    <InfoRow
                      icon={Clock}
                      label="Last Login"
                      value={
                        tenant.lastLoginAt
                          ? new Date(tenant.lastLoginAt).toLocaleDateString()
                          : 'Never'
                      }
                    />
                    {tenant.storefront?.customDomain && (
                      <InfoRow
                        icon={Globe}
                        label="Custom Domain"
                        value={tenant.storefront.customDomain}
                        href={`https://${tenant.storefront.customDomain}`}
                      />
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Enabled Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tenant.features).map(
                      ([feature, enabled]) => (
                        <span
                          key={feature}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium',
                            enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                          {enabled ? ' ✓' : ' ✗'}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Recent Activity
                  </h3>
                  {tenant.recentActivity.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="text-center">
                        <Clock className="mx-auto h-8 w-8 opacity-20" />
                        <p className="mt-2">No recent activity</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tenant.recentActivity.map((activity, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="rounded-full bg-muted p-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              {activity.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-6">
                <MetricCard
                  title="Products"
                  value={tenant.stats.productCount}
                  format="number"
                  icon={<Package className="h-6 w-6" />}
                  accentColor="blue"
                />
                <MetricCard
                  title="Orders"
                  value={tenant.stats.orderCount}
                  format="number"
                  icon={<ShoppingCart className="h-6 w-6" />}
                  accentColor="green"
                />
                <MetricCard
                  title="Total Revenue"
                  value={tenant.stats.totalRevenue}
                  format="currency"
                  icon={<DollarSign className="h-6 w-6" />}
                  accentColor="purple"
                />
                {tenant.subscription && (
                  <MetricCard
                    title="MRR"
                    value={tenant.subscription.priceAmount / 100}
                    format="currency"
                    icon={<TrendingUp className="h-6 w-6" />}
                    accentColor="orange"
                    subtitle={
                      tenant.subscription.currentPeriodEnd
                        ? `Renews ${new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString()}`
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  )
}
