'use client'

import type { TenantHealthScore } from '@madebuy/shared'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Search,
  UserCheck,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

interface TenantTableProps {
  tenants: TenantHealthScore[]
  loading?: boolean
  onImpersonate?: (tenantId: string) => void
}

type SortField =
  | 'name'
  | 'score'
  | 'revenue'
  | 'orders'
  | 'products'
  | 'lastActive'
type SortDirection = 'asc' | 'desc'

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
    if (score >= 50) return 'Warning'
    return 'At Risk'
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        getColor(),
      )}
    >
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          score >= 80
            ? 'bg-emerald-400'
            : score >= 50
              ? 'bg-yellow-400'
              : 'bg-red-400',
        )}
      />
      <span>{score}</span>
      <span className="text-muted-foreground">({getLabel()})</span>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    maker: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    studio: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        colors[plan.toLowerCase()] || colors.free,
      )}
    >
      {plan}
    </span>
  )
}

function SortButton({
  field,
  currentField,
  direction,
  onSort,
  children,
}: {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  children: React.ReactNode
}) {
  const isActive = field === currentField

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide transition-colors',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      <span className="ml-1">
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </button>
  )
}

export function TenantTable({
  tenants,
  loading = false,
  onImpersonate,
}: TenantTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterPlan, setFilterPlan] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...tenants]

    // Filter by search
    if (search) {
      const query = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.businessName.toLowerCase().includes(query) ||
          t.email?.toLowerCase().includes(query),
      )
    }

    // Filter by plan
    if (filterPlan) {
      result = result.filter(
        (t) => t.plan?.toLowerCase() === filterPlan.toLowerCase(),
      )
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.businessName.localeCompare(b.businessName)
          break
        case 'score':
          comparison = a.score - b.score
          break
        case 'revenue':
          comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0)
          break
        case 'orders':
          comparison = (a.orderCount || 0) - (b.orderCount || 0)
          break
        case 'products':
          comparison = (a.productCount || 0) - (b.productCount || 0)
          break
        case 'lastActive':
          comparison =
            new Date(a.lastActive || 0).getTime() -
            new Date(b.lastActive || 0).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [tenants, search, sortField, sortDirection, filterPlan])

  const plans = useMemo(() => {
    const planSet = new Set(
      tenants.map((t) => t.plan?.toLowerCase()).filter(Boolean),
    )
    return Array.from(planSet)
  }, [tenants])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="h-10 w-64 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="h-12 skeleton" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 skeleton border-t border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {plans.map((plan) => (
            <button
              type="button"
              key={plan}
              onClick={() => setFilterPlan(filterPlan === plan ? null : plan)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                filterPlan === plan
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground',
              )}
            >
              {plan}
            </button>
          ))}
          {filterPlan && (
            <button
              type="button"
              onClick={() => setFilterPlan(null)}
              className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left">
                <SortButton
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Business
                </SortButton>
              </th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">
                <SortButton
                  field="score"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Health
                </SortButton>
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  field="products"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Products
                </SortButton>
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  field="orders"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Orders
                </SortButton>
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  field="revenue"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Revenue
                </SortButton>
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  field="lastActive"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Last Active
                </SortButton>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No tenants found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((tenant) => (
                <tr
                  key={tenant.tenantId}
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {tenant.businessName}
                      </p>
                      {tenant.email && (
                        <p className="text-xs text-muted-foreground">
                          {tenant.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <PlanBadge plan={tenant.plan || 'free'} />
                  </td>
                  <td className="px-4 py-4">
                    <HealthBadge score={tenant.score} />
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {formatNumber(tenant.productCount || 0)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {formatNumber(tenant.orderCount || 0)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {formatCurrency(tenant.totalRevenue || 0)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-muted-foreground">
                    {tenant.lastActive
                      ? new Date(tenant.lastActive).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/tenants/${tenant.tenantId}`}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {onImpersonate && (
                        <button
                          type="button"
                          onClick={() => onImpersonate(tenant.tenantId)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Impersonate"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredAndSorted.length} of {tenants.length} tenants
      </p>
    </div>
  )
}
