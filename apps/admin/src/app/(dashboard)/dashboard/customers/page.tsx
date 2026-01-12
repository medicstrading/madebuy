'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Mail,
  MailX,
  MessageSquare,
  Search,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Reply,
  Archive,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer, Enquiry } from '@madebuy/shared'

// ============================================================================
// Types
// ============================================================================

type TabId = 'customers' | 'enquiries'

interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  averageLTV: number
  averageOrderValue: number
  totalRevenue: number
}

// ============================================================================
// Constants
// ============================================================================

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'enquiries', label: 'Enquiries', icon: MessageSquare },
]

// ============================================================================
// Main Component
// ============================================================================

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<TabId>('customers')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [enquiryCount, setEnquiryCount] = useState<number>(0)

  const handleTabChange = (tab: TabId) => {
    if (tab === activeTab) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTransitioning(false)
    }, 150)
  }

  // Fetch enquiry count for badge
  useEffect(() => {
    async function fetchEnquiryCount() {
      try {
        const res = await fetch('/api/enquiries')
        const data = await res.json()
        const newCount = (data.enquiries || []).filter((e: Enquiry) => e.status === 'new').length
        setEnquiryCount(newCount)
      } catch (error) {
        console.error('Failed to fetch enquiry count:', error)
      }
    }
    fetchEnquiryCount()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customers</h1>
        <p className="mt-1 text-gray-500">Manage your customer base and respond to enquiries</p>
      </div>

      {/* Tab Navigation */}
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <nav className="flex gap-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showBadge = tab.id === 'enquiries' && enquiryCount > 0

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2.5 px-5 py-3 text-sm font-medium transition-all duration-200',
                  'rounded-t-xl border border-b-0',
                  isActive
                    ? 'bg-white text-gray-900 border-gray-200 shadow-sm z-10 -mb-px'
                    : 'bg-gray-50/80 text-gray-500 border-transparent hover:bg-gray-100/80 hover:text-gray-700'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                )} />
                <span>{tab.label}</span>
                {showBadge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
                    {enquiryCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className={cn(
        'transition-opacity duration-150',
        isTransitioning ? 'opacity-0' : 'opacity-100'
      )}>
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'enquiries' && <EnquiriesTab />}
      </div>
    </div>
  )
}

// ============================================================================
// Customers Tab
// ============================================================================

function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterSubscribed, setFilterSubscribed] = useState<string>('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchCustomers()
  }, [page, debouncedSearch, filterSubscribed])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchCustomers() {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filterSubscribed) params.set('emailSubscribed', filterSubscribed)

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/customers/stats')
      const data = await res.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch customer stats:', error)
    }
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Customers" value={stats.totalCustomers} icon={Users} color="blue" />
          <StatCard title="Repeat Customers" value={stats.repeatCustomers} icon={TrendingUp} color="emerald" />
          <StatCard title="Avg. LTV" value={formatCurrency(stats.averageLTV)} icon={DollarSign} color="purple" isText />
          <StatCard title="Avg. Order Value" value={formatCurrency(stats.averageOrderValue)} icon={ShoppingCart} color="amber" isText />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
        </div>
        <select
          value={filterSubscribed}
          onChange={(e) => { setFilterSubscribed(e.target.value); setPage(1) }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
        >
          <option value="">All Customers</option>
          <option value="true">Subscribed</option>
          <option value="false">Unsubscribed</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
            <p className="text-gray-500">Customers will appear here once they make a purchase.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/customers/${customer.id}`} className="block hover:text-blue-600">
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{customer.totalOrders}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                      <td className="px-6 py-4">
                        {customer.emailSubscribed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                            <Mail className="h-3 w-3" />
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            <MailX className="h-3 w-3" />
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total} customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Enquiries Tab
// ============================================================================

function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchEnquiries()
  }, [])

  async function fetchEnquiries() {
    try {
      const res = await fetch('/api/enquiries')
      const data = await res.json()
      setEnquiries(data.enquiries || [])
    } catch (error) {
      console.error('Failed to fetch enquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEnquiries = statusFilter === 'all'
    ? enquiries
    : enquiries.filter(e => e.status === statusFilter)

  const stats = {
    total: enquiries.length,
    new: enquiries.filter(e => e.status === 'new').length,
    read: enquiries.filter(e => e.status === 'read').length,
    replied: enquiries.filter(e => e.status === 'replied').length,
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchEnquiries()
    } catch (error) {
      console.error('Failed to update enquiry:', error)
    }
  }

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Total" value={stats.total} icon={Mail} color="blue" />
        <StatCard title="New" value={stats.new} icon={MessageSquare} color="orange" />
        <StatCard title="Read" value={stats.read} icon={Eye} color="purple" />
        <StatCard title="Replied" value={stats.replied} icon={Reply} color="emerald" />
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {['all', 'new', 'read', 'replied', 'archived'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all capitalize',
              statusFilter === status
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {status}
            {status !== 'all' && (
              <span className="ml-1.5 opacity-60">
                {status === 'new' ? stats.new : status === 'read' ? stats.read : status === 'replied' ? stats.replied : 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Enquiries List */}
      {filteredEnquiries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No enquiries</h3>
          <p className="mt-2 text-sm text-gray-500">
            {statusFilter === 'all'
              ? 'Customer messages from your website will appear here.'
              : `No ${statusFilter} enquiries.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Message</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Piece</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEnquiries.map((enquiry) => (
                <tr key={enquiry.id} className={cn('transition-colors', enquiry.status === 'new' ? 'bg-orange-50/30' : 'hover:bg-gray-50')}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{enquiry.name}</div>
                    <a href={`mailto:${enquiry.email}`} className="text-xs text-blue-600 hover:underline">{enquiry.email}</a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2 max-w-md">{enquiry.message}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {enquiry.pieceName || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <EnquiryStatusBadge status={enquiry.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(enquiry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {enquiry.status === 'new' && (
                        <button
                          onClick={() => updateStatus(enquiry.id, 'read')}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Mark as read"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {enquiry.status !== 'replied' && (
                        <a
                          href={`mailto:${enquiry.email}?subject=Re: Enquiry about ${enquiry.pieceName || 'your products'}`}
                          onClick={() => updateStatus(enquiry.id, 'replied')}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Reply"
                        >
                          <Reply className="h-4 w-4" />
                        </a>
                      )}
                      {enquiry.status !== 'archived' && (
                        <button
                          onClick={() => updateStatus(enquiry.id, 'archived')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Shared Components
// ============================================================================

function StatCard({ title, value, icon: Icon, color, isText }: {
  title: string
  value: number | string
  icon: typeof Users
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'orange'
  isText?: boolean
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn('mt-1 font-bold', isText ? 'text-xl' : 'text-2xl', 'text-gray-900')}>{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function EnquiryStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-orange-50 text-orange-700',
    read: 'bg-blue-50 text-blue-700',
    replied: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', colors[status] || colors.new)}>
      {status}
    </span>
  )
}
