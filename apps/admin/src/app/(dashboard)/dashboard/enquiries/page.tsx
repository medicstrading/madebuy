import { requireTenant } from '@/lib/session'
import { enquiries } from '@madebuy/db'
import { formatDate } from '@/lib/utils'
import { Mail, MessageSquare } from 'lucide-react'

export default async function EnquiriesPage() {
  const tenant = await requireTenant()
  const allEnquiries = await enquiries.listEnquiries(tenant.id)

  const stats = {
    total: allEnquiries.length,
    new: allEnquiries.filter(e => e.status === 'new').length,
    replied: allEnquiries.filter(e => e.status === 'replied').length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Enquiries</h1>
        <p className="mt-2 text-gray-600">Customer messages and contacts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total" value={stats.total} icon={Mail} color="blue" />
        <StatCard title="New" value={stats.new} icon={MessageSquare} color="orange" />
        <StatCard title="Replied" value={stats.replied} icon={MessageSquare} color="green" />
      </div>

      {allEnquiries.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No enquiries yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Customer messages from your website will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Piece
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allEnquiries.map((enquiry) => (
                <tr key={enquiry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{enquiry.name}</div>
                    <div className="text-xs text-gray-500">{enquiry.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2 max-w-md">
                      {enquiry.message}
                    </div>
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
  color: 'blue' | 'orange' | 'green'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
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

function EnquiryStatusBadge({ status }: { status: string }) {
  const colors = {
    new: 'bg-orange-100 text-orange-800',
    read: 'bg-blue-100 text-blue-800',
    replied: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.new}`}>
      {status}
    </span>
  )
}
