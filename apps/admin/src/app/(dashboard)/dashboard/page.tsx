import { enquiries, media, orders, pieces } from '@madebuy/db'
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Image,
  Mail,
  Package,
  Plus,
  Settings,
  Share,
  ShoppingCart,
} from 'lucide-react'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AnalyticsWidget } from '@/components/dashboard/AnalyticsWidget'
import { FinanceWidgets } from '@/components/dashboard/FinanceWidgets'
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts'
import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist'
import { requireTenant } from '@/lib/session'

const getCachedDashboardStats = unstable_cache(
  async (tenantId: string) => {
    const [piecesCount, mediaCount, ordersCount, enquiriesCount, recentOrders] =
      await Promise.all([
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
  },
  ['dashboard-stats'],
  { revalidate: 60, tags: ['dashboard'] },
)

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const tenant = await requireTenant()

  // Redirect to onboarding if not completed
  if (tenant.onboardingComplete !== true) {
    redirect('/dashboard/onboarding')
  }

  const stats = await getCachedDashboardStats(tenant.id)
  const greeting = getTimeOfDayGreeting()

  // Check if there's at least one product
  const hasProducts = stats.pieces > 0

  return (
    <div className="space-y-6">
      {/* Getting Started Checklist */}
      <div className="animate-fade-in-up delay-0">
        <GettingStartedChecklist tenant={{ ...tenant, hasProducts }} />
      </div>

      {/* Stripe Warning Banner */}
      {!tenant.paymentConfig?.stripe?.connectAccountId && (
        <div className="animate-fade-in-up delay-0 rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Payment setup required
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                You cannot receive payments yet. Connect your Stripe account to
                start accepting orders.
              </p>
              <Link
                href="/dashboard/connections"
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Connect Stripe
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner - Hero Moment */}
      <div className="animate-fade-in-scale delay-0 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-2xl">
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-3">
            {greeting}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            {tenant.businessName}
          </h1>
          <p className="text-slate-300 max-w-lg text-lg">
            Your studio command center. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        {/* Decorative gradient orbs - more prominent */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/25 to-purple-500/25 blur-3xl" />
        <div className="absolute -right-8 top-12 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 blur-2xl" />
        <div className="absolute -bottom-8 left-1/4 h-32 w-56 rounded-full bg-gradient-to-r from-indigo-500/15 to-transparent blur-2xl" />
        <div className="absolute bottom-4 right-8 h-20 w-20 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-xl" />
      </div>

      {/* Studio Vitals - Overview Stats */}
      <section className="animate-fade-in-up delay-1 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
            Studio Vitals
          </h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Products"
              value={stats.pieces}
              icon={Package}
              color="blue"
              delay={2}
            />
            <StatCard
              title="Media Files"
              value={stats.media}
              icon={Image}
              color="purple"
              delay={3}
            />
            <StatCard
              title="Orders"
              value={stats.orders}
              icon={ShoppingCart}
              color="green"
              delay={4}
            />
            <StatCard
              title="Enquiries"
              value={stats.enquiries}
              icon={Mail}
              color="amber"
              delay={5}
            />
          </div>
        </div>
      </section>

      {/* Finance Widgets */}
      <div className="animate-fade-in-up delay-2">
        <FinanceWidgets />
      </div>

      {/* Low Stock Alerts */}
      <div className="animate-fade-in-up delay-3">
        <LowStockAlerts />
      </div>

      {/* Analytics Widget */}
      <div className="animate-fade-in-up delay-4">
        <AnalyticsWidget />
      </div>

      {/* Orders & Quick Actions Row */}
      <div className="grid gap-6 lg:grid-cols-3 animate-fade-in-up delay-5">
        {/* Recent Orders Section */}
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
              Recent Orders
            </h2>
            <Link
              href="/dashboard/orders"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(() => {
              const recentOrders =
                'data' in stats.recentOrders
                  ? stats.recentOrders.data
                  : stats.recentOrders
              return recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <div
                    key={order._id?.toString()}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                  >
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
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      ${(order.total / 100).toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 mb-4">
                    <ShoppingCart className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    No orders yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Orders will appear here once customers start buying
                  </p>
                </div>
              )
            })()}
          </div>
        </section>

        {/* Quick Actions Section */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
              Quick Actions
            </h2>
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
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string
  value: number
  icon: any
  color: 'blue' | 'purple' | 'green' | 'amber'
  delay?: number
}) {
  const colorConfig = {
    blue: {
      icon: 'bg-blue-500 text-white',
      border: 'hover:border-blue-200',
      glow: 'hover:shadow-blue-100/50',
    },
    purple: {
      icon: 'bg-purple-500 text-white',
      border: 'hover:border-purple-200',
      glow: 'hover:shadow-purple-100/50',
    },
    green: {
      icon: 'bg-emerald-500 text-white',
      border: 'hover:border-emerald-200',
      glow: 'hover:shadow-emerald-100/50',
    },
    amber: {
      icon: 'bg-amber-500 text-white',
      border: 'hover:border-amber-200',
      glow: 'hover:shadow-amber-100/50',
    },
  }

  const config = colorConfig[color]

  return (
    <div
      className={`animate-fade-in-up delay-${delay} rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-5 transition-all duration-300 hover:shadow-lg ${config.border} ${config.glow} hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 shadow-sm ${config.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold text-gray-900 tracking-tight tabular-nums">
          {value}
        </p>
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
  color,
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
      className="group flex items-center gap-3 rounded-xl p-3 border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200"
    >
      <div className={`rounded-xl p-2.5 transition-all ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
        <ArrowRight className="h-4 w-4 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
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
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || 'bg-gray-50 text-gray-700'}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
