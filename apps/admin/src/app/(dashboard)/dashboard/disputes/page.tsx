import { requireTenant } from '@/lib/session'
import { disputes } from '@madebuy/db'
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { DisputesTable } from './DisputesTable'

export default async function DisputesPage() {
  const tenant = await requireTenant()

  // Fetch stats and disputes in parallel
  const [stats, allDisputes] = await Promise.all([
    disputes.getDisputeStats(tenant.id),
    disputes.listDisputes(tenant.id)
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Disputes</h1>
        <p className="mt-2 text-gray-600">
          Track and respond to customer chargebacks and payment disputes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Needs Response"
          value={stats.needsResponse}
          icon={AlertTriangle}
          color="red"
          urgent={stats.needsResponse > 0}
        />
        <StatCard
          title="Under Review"
          value={stats.underReview}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Won"
          value={stats.won}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Lost"
          value={stats.lost}
          icon={XCircle}
          color="gray"
        />
      </div>

      {stats.needsResponse > 0 && (
        <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">
                Action Required: {stats.needsResponse} dispute{stats.needsResponse > 1 ? 's' : ''} need{stats.needsResponse === 1 ? 's' : ''} your response
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Submit evidence before the deadline or you will automatically lose the dispute.
                Click on a dispute to respond via the Stripe Dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {allDisputes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No disputes</h3>
          <p className="mt-2 text-sm text-gray-600">
            Great news! You have no chargebacks or disputes.
          </p>
        </div>
      ) : (
        <DisputesTable disputes={allDisputes} />
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  urgent = false
}: {
  title: string
  value: number
  icon: any
  color: 'red' | 'yellow' | 'green' | 'gray'
  urgent?: boolean
}) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className={`rounded-lg bg-white p-4 shadow ${urgent ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
