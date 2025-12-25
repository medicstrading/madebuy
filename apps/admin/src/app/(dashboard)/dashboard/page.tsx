import { requireTenant } from '@/lib/session'
import { Package, Image, ShoppingCart, Mail } from 'lucide-react'
import { pieces, media, orders, enquiries } from '@madebuy/db'

async function getDashboardStats(tenantId: string) {
  const [piecesCount, mediaCount, ordersCount, enquiriesCount] = await Promise.all([
    pieces.countPieces(tenantId),
    media.countMedia(tenantId),
    orders.countOrders(tenantId),
    enquiries.countEnquiries(tenantId),
  ])

  return {
    pieces: piecesCount,
    media: mediaCount,
    orders: ordersCount,
    enquiries: enquiriesCount,
  }
}

export default async function DashboardPage() {
  const tenant = await requireTenant()
  const stats = await getDashboardStats(tenant.id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {tenant.businessName}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pieces"
          value={stats.pieces}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Media"
          value={stats.media}
          icon={Image}
          color="purple"
        />
        <StatCard
          title="Orders"
          value={stats.orders}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Enquiries"
          value={stats.enquiries}
          icon={Mail}
          color="orange"
        />
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          🎉 Welcome to MadeBuy!
        </h2>
        <p className="text-blue-800">
          Your business management platform is ready. Start by adding your first piece to the inventory.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: number
  icon: any
  color: 'blue' | 'purple' | 'green' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
