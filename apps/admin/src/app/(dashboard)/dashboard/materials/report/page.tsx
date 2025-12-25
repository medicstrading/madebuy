import { requireTenant } from '@/lib/session'
import { materials, pieces } from '@madebuy/db'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle, DollarSign, Package } from 'lucide-react'
import Link from 'next/link'

export default async function MaterialsReportPage() {
  const tenant = await requireTenant()

  // Get all materials and pieces
  const allMaterials = await materials.listMaterials(tenant.id)
  const allPieces = await pieces.listPieces(tenant.id)

  // Calculate total material value (stock on hand)
  const totalMaterialValue = allMaterials.reduce(
    (sum, material) => sum + (material.quantityInStock * material.costPerUnit),
    0
  )

  // Count low stock materials
  const lowStockMaterials = allMaterials.filter(m => m.isLowStock).length

  // Calculate total COGS across all pieces
  const pieceCOGSPromises = allPieces.map(piece =>
    materials.calculatePieceCOGS(tenant.id, piece.id)
  )
  const pieceCOGSValues = await Promise.all(pieceCOGSPromises)
  const totalCOGS = pieceCOGSValues.reduce((sum, cogs) => sum + cogs, 0)

  // Calculate total potential revenue (sum of all piece prices)
  const totalPotentialRevenue = allPieces.reduce(
    (sum, piece) => sum + (piece.price || 0),
    0
  )

  // Calculate average margin
  const averageMargin = totalPotentialRevenue > 0
    ? ((totalPotentialRevenue - totalCOGS) / totalPotentialRevenue) * 100
    : 0

  // Group materials by category
  const materialsByCategory = allMaterials.reduce((acc, material) => {
    const category = material.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = {
        materials: [],
        totalValue: 0,
      }
    }
    acc[category].materials.push(material)
    acc[category].totalValue += material.quantityInStock * material.costPerUnit
    return acc
  }, {} as Record<string, { materials: any[]; totalValue: number }>)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Materials Report</h1>
        <p className="mt-2 text-gray-600">Analytics and insights about your material costs and usage</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Material Value"
          value={formatCurrency(totalMaterialValue)}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total COGS"
          value={formatCurrency(totalCOGS)}
          icon={<Package className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Average Margin"
          value={`${averageMargin.toFixed(1)}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color={averageMargin > 50 ? 'green' : averageMargin > 30 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockMaterials.toString()}
          icon={<AlertTriangle className="h-6 w-6" />}
          color={lowStockMaterials > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Materials by Category */}
      <div className="rounded-lg bg-white p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Materials by Category</h2>

        {Object.keys(materialsByCategory).length === 0 ? (
          <p className="text-gray-500">No materials to display</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(materialsByCategory)
              .sort((a, b) => b[1].totalValue - a[1].totalValue)
              .map(([category, data]) => (
                <div key={category} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{category}</h3>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(data.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{data.materials.length} material{data.materials.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>
                      {data.materials.filter(m => m.isLowStock).length} low stock
                    </span>
                  </div>

                  {/* Material breakdown */}
                  <div className="mt-2 space-y-1">
                    {data.materials.map(material => {
                      const value = material.quantityInStock * material.costPerUnit
                      return (
                        <div key={material.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">{material.name}</span>
                            {material.isLowStock && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                Low Stock
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600">
                            {material.quantityInStock.toFixed(2)} {material.unit} • {formatCurrency(value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Pieces with Highest COGS */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pieces by Material Cost</h2>

        {allPieces.length === 0 ? (
          <p className="text-gray-500">No pieces to display</p>
        ) : (
          <div className="space-y-3">
            {(await Promise.all(
              allPieces.map(async (piece) => {
                const cogs = await materials.calculatePieceCOGS(tenant.id, piece.id)
                const margin = piece.price && cogs > 0 ? piece.price - cogs : null
                const marginPercent = piece.price && piece.price > 0 && margin !== null
                  ? (margin / piece.price) * 100
                  : null
                return { ...piece, cogs, margin, marginPercent }
              })
            ))
              .sort((a, b) => b.cogs - a.cogs)
              .slice(0, 10)
              .map(piece => (
                <Link
                  key={piece.id}
                  href={`/dashboard/inventory/${piece.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{piece.name}</h3>
                      <p className="text-sm text-gray-600">{piece.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        COGS: {formatCurrency(piece.cogs)}
                      </div>
                      {piece.price && (
                        <div className="text-sm text-gray-600">
                          Price: {formatCurrency(piece.price)}
                        </div>
                      )}
                      {piece.marginPercent !== null && (
                        <div className={`text-sm font-medium ${
                          piece.marginPercent > 50 ? 'text-green-600' :
                          piece.marginPercent > 30 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          Margin: {piece.marginPercent.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
