import { requireTenant } from '@/lib/session'
import { pieces, materials } from '@madebuy/db'
import { Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { InventoryTable } from '@/components/inventory/InventoryTable'

export default async function InventoryPage() {
  const tenant = await requireTenant()
  const allPieces = await pieces.listPieces(tenant.id)
  const lowStockPieces = await pieces.getLowStockPieces(tenant.id)

  // Batch fetch COGS for all pieces in single aggregation query
  const pieceIds = allPieces.map(p => p.id)
  const cogsMap = await materials.calculateBatchCOGS(tenant.id, pieceIds)
  const piecesWithCOGS = allPieces.map(piece => ({
    ...piece,
    cogs: cogsMap.get(piece.id) || 0
  }))

  // Low stock counts
  const outOfStockCount = lowStockPieces.filter(p => p.stock === 0).length
  const belowThresholdCount = lowStockPieces.filter(p => p.stock > 0).length

  return (
    <div>
      {/* Low Stock Alert Banner */}
      {lowStockPieces.length > 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800">
                  {lowStockPieces.length} item{lowStockPieces.length === 1 ? '' : 's'} need attention
                </p>
                <p className="text-sm text-amber-600">
                  {outOfStockCount > 0 && <span className="text-red-600 font-medium">{outOfStockCount} out of stock</span>}
                  {outOfStockCount > 0 && belowThresholdCount > 0 && ', '}
                  {belowThresholdCount > 0 && <span>{belowThresholdCount} below threshold</span>}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/inventory/low-stock"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              View Low Stock
            </Link>
          </div>
        </div>
      )}

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
        <InventoryTable pieces={piecesWithCOGS} />
      )}
    </div>
  )
}

function Package2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
