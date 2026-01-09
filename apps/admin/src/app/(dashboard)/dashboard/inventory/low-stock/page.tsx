import { requireTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, Package, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { BulkThresholdUpdate } from './BulkThresholdUpdate'

export const metadata = {
  title: 'Low Stock Items | MadeBuy',
  description: 'View and manage items with low stock levels',
}

export default async function LowStockPage() {
  const tenant = await requireTenant()
  const lowStockPieces = await pieces.getLowStockPieces(tenant.id)

  // Group by stock status
  const outOfStock = lowStockPieces.filter(p => p.stock === 0)
  const lowStock = lowStockPieces.filter(p => p.stock > 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Low Stock Items</h1>
            <p className="mt-2 text-gray-600">
              Items that are at or below their restock threshold
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Low Stock</p>
              <p className="text-3xl font-bold text-gray-900">{lowStockPieces.length}</p>
            </div>
            <Package className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600">{outOfStock.length}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Below Threshold</p>
              <p className="text-3xl font-bold text-amber-600">{lowStock.length}</p>
            </div>
            <Package className="h-10 w-10 text-amber-400" />
          </div>
        </div>
      </div>

      {lowStockPieces.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center bg-white">
          <Package className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">All stocked up!</h3>
          <p className="mt-2 text-sm text-gray-600">
            No items are currently below their restock threshold.
          </p>
          <Link
            href="/dashboard/inventory"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View All Inventory
          </Link>
        </div>
      ) : (
        <>
          {/* Out of Stock Section */}
          {outOfStock.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Out of Stock ({outOfStock.length})
              </h2>
              <div className="rounded-lg bg-white shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Threshold
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {outOfStock.map((piece) => (
                      <tr key={piece.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-gray-900">{piece.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {piece.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={piece.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                            0
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
                          {piece.lowStockThreshold}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/inventory/${piece.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Edit
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Section */}
          {lowStock.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                Low Stock ({lowStock.length})
              </h2>
              <div className="rounded-lg bg-white shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Threshold
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {lowStock.map((piece) => (
                      <tr key={piece.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-gray-900">{piece.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {piece.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={piece.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                            {piece.stock}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
                          {piece.lowStockThreshold}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/inventory/${piece.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Edit
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk Update Section */}
          <BulkThresholdUpdate pieces={lowStockPieces} />
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.draft}`}>
      {status}
    </span>
  )
}
