import { requireTenant } from '@/lib/session'
import { promotions } from '@madebuy/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Tag, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function PromotionsPage() {
  const tenant = await requireTenant()
  const allPromotions = await promotions.listPromotions(tenant.id)
  const activePromotions = allPromotions.filter(p => p.isActive)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promotions</h1>
          <p className="mt-2 text-gray-600">Manage discount codes and campaigns</p>
        </div>
        <Link
          href="/dashboard/promotions/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Promotion
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          title="Total Promotions"
          value={allPromotions.length}
          icon={Tag}
          color="blue"
        />
        <StatCard
          title="Active"
          value={activePromotions.length}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Uses"
          value={allPromotions.reduce((sum, p) => sum + p.timesUsed, 0)}
          icon={Calendar}
          color="purple"
        />
      </div>

      {allPromotions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No promotions yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Create discount codes to boost sales and reward customers.
          </p>
          <Link
            href="/dashboard/promotions/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Promotion
          </Link>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Valid Until
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allPromotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{promo.name}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                      {promo.code || '-'}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <PromotionTypeBadge type={promo.type} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {promo.type === 'percentage' ? `${promo.value}%` :
                     promo.type === 'fixed_amount' ? formatCurrency(promo.value) :
                     'Free Shipping'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {promo.timesUsed}
                    {promo.maxUses && ` / ${promo.maxUses}`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {promo.endDate ? formatDate(promo.endDate) : 'No limit'}
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

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: number
  icon: any
  color: 'blue' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function PromotionTypeBadge({ type }: { type: string }) {
  const colors = {
    percentage: 'bg-blue-100 text-blue-800',
    fixed_amount: 'bg-green-100 text-green-800',
    free_shipping: 'bg-purple-100 text-purple-800',
  }

  const labels = {
    percentage: 'Percentage',
    fixed_amount: 'Fixed Amount',
    free_shipping: 'Free Shipping',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[type as keyof typeof colors]}`}>
      {labels[type as keyof typeof labels]}
    </span>
  )
}
