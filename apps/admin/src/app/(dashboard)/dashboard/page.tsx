import { requireTenant } from '@/lib/session'
import { Package, Image, ShoppingCart, Mail, TrendingUp, TrendingDown, Plus, Share, Settings, ArrowRight, Eye, Star, Clock } from 'lucide-react'
import { pieces, media, orders, enquiries } from '@madebuy/db'
import Link from 'next/link'
import { FinanceWidgets } from '@/components/dashboard/FinanceWidgets'

async function getDashboardStats(tenantId: string) {
  const [piecesCount, mediaCount, ordersCount, enquiriesCount, recentOrders] = await Promise.all([
    pieces.countPieces(tenantId),
    media.countMedia(tenantId),
    orders.countOrders(tenantId),
    enquiries.countEnquiries(tenantId),
    orders.listOrders(tenantId, { limit: 5 }),
  ])

  return {
    pieces: piecesCount,
    media: mediaCount,
    orders: ordersCount,
    enquiries: enquiriesCount,
    recentOrders,
  }
}

export default async function DashboardPage() {
  const tenant = await requireTenant()
  const stats = await getDashboardStats(tenant.id)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-2">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{tenant.businessName}</h1>
          <p className="text-slate-300 max-w-md text-base">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        {/* Decorative gradient orbs */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -right-10 top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-24 w-48 rounded-full bg-gradient-to-r from-indigo-500/10 to-transparent blur-2xl" />
      </div>

      {/* Overview Section - Contained Card */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Overview</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Last 30 days</span>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Products"
              value={stats.pieces}
              icon={Package}
              trend={12}
              trendLabel="vs last month"
              color="blue"
            />
            <StatCard
              title="Media Files"
              value={stats.media}
              icon={Image}
              trend={8}
              trendLabel="vs last month"
              color="purple"
            />
            <StatCard
              title="Orders"
              value={stats.orders}
              icon={ShoppingCart}
              trend={-3}
              trendLabel="vs last month"
              color="green"
            />
            <StatCard
              title="Enquiries"
              value={stats.enquiries}
              icon={Mail}
              trend={24}
              trendLabel="vs last month"
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Finance Widgets */}
      <FinanceWidgets />

      {/* Orders & Quick Actions Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Section - Contained Card */}
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order: any) => (
                <div key={order._id?.toString()} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200">
                    <ShoppingCart className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Order #{order._id?.toString().slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.customerEmail || 'No email'}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                  <p className="text-sm font-semibold text-gray-900">
                    ${(order.total / 100).toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 mb-4">
                  <ShoppingCart className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No orders yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Orders will appear here once customers start buying</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions Section - Contained Card */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <QuickAction
                href="/dashboard/inventory/new"
                icon={Plus}
                label="Add New Product"
                description="List a new item for sale"
                color="blue"
              />
              <QuickAction
                href="/dashboard/publish"
                icon={Share}
                label="Share on Social"
                description="Promote your products"
                color="purple"
              />
              <QuickAction
                href="/dashboard/website-design"
                icon={Settings}
                label="Edit Store Design"
                description="Customize your storefront"
                color="green"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Activity Section - Contained Card */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Today</span>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActivityItem
              icon={Eye}
              text="Store viewed"
              time="2 minutes ago"
            />
            <ActivityItem
              icon={Star}
              text="New review received"
              time="1 hour ago"
            />
            <ActivityItem
              icon={ShoppingCart}
              text="Product added to cart"
              time="3 hours ago"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color
}: {
  title: string
  value: number
  icon: any
  trend: number
  trendLabel: string
  color: 'blue' | 'purple' | 'green' | 'amber'
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    green: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
  }

  const isPositive = trend >= 0

  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-5 transition-all hover:shadow-md hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 shadow-sm ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-1 font-medium">{title}</p>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  color
}: {
  href: string
  icon: any
  label: string
  description: string
  color: 'blue' | 'purple' | 'green'
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white shadow-sm shadow-blue-500/25',
    purple: 'bg-purple-500 text-white shadow-sm shadow-purple-500/25',
    green: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl p-3 border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className={`rounded-xl p-2.5 transition-all ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
        <ArrowRight className="h-4 w-4 text-gray-500" />
      </div>
    </Link>
  )
}

function ActivityItem({
  icon: Icon,
  text,
  time
}: {
  icon: any
  text: string
  time: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    processing: 'bg-blue-50 text-blue-700',
    shipped: 'bg-purple-50 text-purple-700',
    delivered: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || 'bg-gray-50 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
