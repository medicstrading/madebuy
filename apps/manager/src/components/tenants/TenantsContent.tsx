'use client'

import type {
  TenantCounts,
  TenantHealthScore,
  TenantsByPlan,
} from '@madebuy/shared'
import {
  AlertTriangle,
  Download,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { TenantTable } from '@/components/tables/TenantTable'
import { MetricCard } from '@/components/ui/MetricCard'

interface TenantsData {
  tenants: TenantHealthScore[]
  counts: TenantCounts
  byPlan: TenantsByPlan[]
}

export function TenantsContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const _router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<TenantsData>({
    tenants: [],
    counts: {
      total: 0,
      active: 0,
      trial: 0,
      churned: 0,
      suspended: 0,
    },
    byPlan: [],
  })

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (res.ok) {
        const { redirectUrl } = await res.json()
        window.open(redirectUrl, '_blank')
      } else {
        console.error('Impersonation failed')
      }
    } catch (error) {
      console.error('Impersonation error:', error)
    }
  }

  const handleExport = async () => {
    // Export tenants to CSV
    const headers = [
      'Business Name',
      'Email',
      'Plan',
      'Health Score',
      'Products',
      'Orders',
      'Revenue',
      'Last Active',
    ]
    const rows = data.tenants.map((t) => [
      t.businessName,
      t.email || '',
      t.plan,
      t.score.toString(),
      t.productCount.toString(),
      t.orderCount.toString(),
      (t.totalRevenue || 0).toFixed(2),
      t.lastActive ? new Date(t.lastActive).toISOString() : 'Never',
    ])

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
          title="Tenants"
          subtitle="Manage and monitor platform tenants"
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          actions={
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          }
        />

        {/* Summary Metrics */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Tenants"
            value={data.counts.total}
            format="number"
            icon={<Users className="h-6 w-6" />}
            loading={loading}
            accentColor="blue"
          />
          <MetricCard
            title="Active (Paying)"
            value={data.counts.active}
            format="number"
            icon={<UserPlus className="h-6 w-6" />}
            loading={loading}
            accentColor="green"
            subtitle={`${data.counts.total > 0 ? ((data.counts.active / data.counts.total) * 100).toFixed(1) : 0}% of total`}
          />
          <MetricCard
            title="Churned (30d)"
            value={data.counts.churned}
            format="number"
            icon={<UserMinus className="h-6 w-6" />}
            loading={loading}
            accentColor="orange"
          />
          <MetricCard
            title="At Risk"
            value={
              data.tenants.filter(
                (t) => t.riskLevel === 'at-risk' || t.riskLevel === 'churning',
              ).length
            }
            format="number"
            icon={<AlertTriangle className="h-6 w-6" />}
            loading={loading}
            accentColor="purple"
            subtitle="Needs attention"
          />
        </div>

        {/* Plan Distribution */}
        {data.byPlan.length > 0 && (
          <div className="mb-8 rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Distribution by Plan
            </h3>
            <div className="flex gap-4">
              {data.byPlan.map((plan) => (
                <div key={plan.plan} className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize text-foreground">
                      {plan.plan}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {plan.count}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${plan.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.percentage.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tenant Table */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            All Tenants
          </h3>
          <TenantTable
            tenants={data.tenants}
            loading={loading}
            onImpersonate={handleImpersonate}
          />
        </div>
      </main>
    </div>
  )
}
