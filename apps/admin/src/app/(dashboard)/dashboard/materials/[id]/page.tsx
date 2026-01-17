import { materials } from '@madebuy/db'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MaterialForm } from '@/components/materials/MaterialForm'
import { getCurrentTenant } from '@/lib/session'

interface PageProps {
  params: {
    id: string
  }
}

export default async function MaterialDetailPage({ params }: PageProps) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    redirect('/login')
  }

  const material = await materials.getMaterial(tenant.id, params.id)
  if (!material) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/materials"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Materials
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Edit Material</h1>
          <p className="text-gray-600 mt-1">
            Update material information and stock levels
          </p>
        </div>

        <div className="p-6">
          <MaterialForm tenantId={tenant.id} material={material} />
        </div>
      </div>

      {material.invoiceIds && material.invoiceIds.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Restock History
            </h2>
          </div>
          <div className="p-6">
            <div className="text-sm text-gray-600">
              This material has been restocked from {material.invoiceIds.length}{' '}
              invoice{material.invoiceIds.length !== 1 ? 's' : ''}
            </div>
            <div className="mt-4 space-y-2">
              {material.invoiceIds.map((invoiceId) => (
                <Link
                  key={invoiceId}
                  href={`/dashboard/materials/invoices/${invoiceId}`}
                  className="block px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      Invoice #{invoiceId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-gray-500">View details →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
