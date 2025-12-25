import { requireTenant } from '@/lib/session'
import { materials } from '@madebuy/db'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { Plus, AlertTriangle, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default async function MaterialsPage() {
  const tenant = await requireTenant()
  const allMaterials = await materials.listMaterials(tenant.id)
  const lowStockMaterials = allMaterials.filter(m => m.isLowStock)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Materials</h1>
          <p className="mt-2 text-gray-600">Track your supplies and calculate costs</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/materials/report"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4" />
            View Report
          </Link>
          <Link
            href="/dashboard/materials/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </Link>
        </div>
      </div>

      {lowStockMaterials.length > 0 && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Low Stock Alert</h3>
              <p className="mt-1 text-sm text-orange-800">
                {lowStockMaterials.length} material{lowStockMaterials.length !== 1 ? 's' : ''} running low on stock
              </p>
            </div>
          </div>
        </div>
      )}

      {allMaterials.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <LayersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No materials yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Start tracking your supplies and materials to calculate accurate costs.
          </p>
          <Link
            href="/dashboard/materials/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Material
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
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cost/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Supplier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allMaterials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{material.name}</div>
                      {material.isLowStock && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                      {material.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatNumber(material.quantityInStock)} {material.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      Reorder at: {formatNumber(material.reorderPoint)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(material.costPerUnit, material.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {material.supplier || '-'}
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

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  )
}
