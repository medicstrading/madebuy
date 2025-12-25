import { requireTenant } from '@/lib/session'
import { pieces, materials } from '@madebuy/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Store } from 'lucide-react'
import Link from 'next/link'

export default async function InventoryPage() {
  const tenant = await requireTenant()
  const allPieces = await pieces.listPieces(tenant.id)

  // Fetch COGS for each piece
  const piecesWithCOGS = await Promise.all(
    allPieces.map(async (piece) => {
      const cogs = await materials.calculatePieceCOGS(tenant.id, piece.id)
      return { ...piece, cogs }
    })
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-gray-600">Manage your pieces and products</p>
        </div>
        <Link
          href="/dashboard/inventory/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Piece
        </Link>
      </div>

      {piecesWithCOGS.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Package2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No pieces yet</h3>
          <p className="mt-2 text-sm text-gray-600">Get started by adding your first piece to the inventory.</p>
          <Link
            href="/dashboard/inventory/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Piece
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  COGS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Synced
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {piecesWithCOGS.map((piece) => {
                const margin = piece.price && piece.cogs > 0 ? piece.price - piece.cogs : null
                const marginPercent = piece.price && piece.price > 0 && margin !== null
                  ? (margin / piece.price) * 100
                  : null

                return (
                  <tr key={piece.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{piece.name}</div>
                      {piece.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{piece.description}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={piece.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {piece.price ? formatCurrency(piece.price, piece.currency) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {piece.cogs > 0 ? formatCurrency(piece.cogs, piece.currency) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {margin !== null && marginPercent !== null ? (
                        <div>
                          <div className={`font-medium ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(margin, piece.currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {marginPercent.toFixed(1)}%
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {piece.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {piece.integrations?.etsy?.listingId ? (
                        <a
                          href={piece.integrations.etsy.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          title="View on Etsy"
                        >
                          <Store className="h-4 w-4" />
                          <span className="text-xs">Etsy</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(piece.createdAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

function Package2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
