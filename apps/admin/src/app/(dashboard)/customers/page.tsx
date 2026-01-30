'use client'

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Mail,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Customer {
  id: string
  email: string
  name: string
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  firstOrderAt: string
  lastOrderAt: string
  emailSubscribed: boolean
  acquisitionSource?: string
}

interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  averageLTV: number
  averageOrderValue: number
  totalRevenue: number
}

interface TopCustomer {
  customerId: string
  email: string
  name: string
  lifetimeValue: number
  predictedLTV: number
  orderCount: number
  avgOrderValue: number
  daysSinceFirstOrder: number
  daysSinceLastOrder: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'repeat'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [_sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent')

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch stats
      const statsRes = await fetch('/api/analytics/customers?type=stats')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      // Fetch top customers
      const topRes = await fetch('/api/analytics/customers?type=top&limit=10')
      if (topRes.ok) {
        const data = await topRes.json()
        setTopCustomers(data.customers || [])
      }

      // Fetch customers list
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filter === 'subscribed' && { emailSubscribed: 'true' }),
        ...(filter === 'repeat' && { minOrders: '2' }),
        ...(search && { search }),
      })

      const customersRes = await fetch(`/api/customers?${params}`)
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
        setTotalPages(Math.ceil((data.total || 0) / 20))
      }
    } catch (error) {
      console.error('Error fetching customer data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function exportCustomers() {
    try {
      const res = await fetch('/api/customers/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting customers:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            Manage your customer base and track lifetime value
          </p>
        </div>
        <button
          type="button"
          onClick={exportCustomers}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="New Customers"
            value={stats.newCustomers}
            icon={TrendingUp}
            color="green"
            subtitle="Last 30 days"
          />
          <StatCard
            title="Average LTV"
            value={formatCurrency(stats.averageLTV)}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Repeat Rate"
            value={`${stats.totalCustomers > 0 ? Math.round((stats.repeatCustomers / stats.totalCustomers) * 100) : 0}%`}
            icon={ShoppingBag}
            color="amber"
            subtitle={`${stats.repeatCustomers} repeat buyers`}
          />
        </div>
      )}

      {/* Top Customers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">
            Top Customers by LTV
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Lifetime Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Predicted LTV
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Orders
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Avg Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Last Order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer, index) => (
                  <tr key={customer.customerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.lifetimeValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-green-600">
                      {formatCurrency(customer.predictedLTV)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {formatCurrency(customer.avgOrderValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {customer.daysSinceLastOrder === 0
                        ? 'Today'
                        : `${customer.daysSinceLastOrder} days ago`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers yet. Customers will appear here after their
                    first order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Customers List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-base font-semibold text-gray-900">
              All Customers
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as 'all' | 'subscribed' | 'repeat')
                }
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Customers</option>
                <option value="subscribed">Email Subscribed</option>
                <option value="repeat">Repeat Buyers</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <button
                    type="button"
                    onClick={() => setSortBy('orders')}
                    className="flex items-center gap-1 ml-auto hover:text-gray-700"
                  >
                    Orders
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <button
                    type="button"
                    onClick={() => setSortBy('spent')}
                    className="flex items-center gap-1 ml-auto hover:text-gray-700"
                  >
                    Total Spent
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Source
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <button
                    type="button"
                    onClick={() => setSortBy('recent')}
                    className="flex items-center gap-1 ml-auto hover:text-gray-700"
                  >
                    Last Order
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {customer.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {customer.totalOrders}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {customer.emailSubscribed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <Mail className="h-3 w-3" />
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {customer.acquisitionSource || 'Direct'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {formatDate(customer.lastOrderAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'purple' | 'amber'
  subtitle?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-emerald-500 text-white',
    purple: 'bg-purple-500 text-white',
    amber: 'bg-amber-500 text-white',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`rounded-xl p-2.5 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
