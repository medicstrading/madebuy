import { requireTenant } from '@/lib/session'
import { pieces, materials, productionRuns } from '@madebuy/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { PersonalizationConfigEditor } from '@/components/inventory/PersonalizationConfigEditor'
import { PieceDetailsEditor } from '@/components/inventory/PieceDetailsEditor'
import { DigitalProductSection } from '@/components/inventory/DigitalProductSection'
import { ProductionSection } from '@/components/production/ProductionSection'

interface PieceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PieceDetailPage({ params }: PieceDetailPageProps) {
  const tenant = await requireTenant()
  const { id } = await params
  const piece = await pieces.getPiece(tenant.id, id)

  if (!piece) {
    notFound()
  }

  // Fetch materials and production history for production section
  const [materialsResult, runs] = await Promise.all([
    materials.listMaterials(tenant.id, {}, { limit: 500 }),
    productionRuns.getProductionRunsForPiece(tenant.id, id, 10),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">{piece.name}</h1>
      </div>

      <div className="space-y-6">
        {/* Product Details - Editable */}
        <div className="rounded-lg bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" />
            Product Details
            <span className="text-xs font-normal text-gray-400 ml-2">Hover to edit</span>
          </h2>

          <PieceDetailsEditor piece={piece} />
        </div>

        {/* Digital Product */}
        <DigitalProductSection
          pieceId={piece.id}
          digital={piece.digital}
        />

        {/* Production Section */}
        <ProductionSection
          piece={piece}
          materials={materialsResult.materials}
          productionRuns={runs}
        />

        {/* Personalization Config */}
        <div className="rounded-lg bg-white shadow p-6">
          <PersonalizationConfigEditor
            pieceId={piece.id}
            pieceName={piece.name}
            initialConfig={piece.personalization}
          />
        </div>
      </div>
    </div>
  )
}
