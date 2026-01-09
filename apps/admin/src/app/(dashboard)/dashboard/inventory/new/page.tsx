import { requireTenant } from '@/lib/session'
import { PieceForm } from '@/components/inventory/PieceForm'
import { materials } from '@madebuy/db'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewPiecePage() {
  const tenant = await requireTenant()

  // Get all materials for this tenant to populate the material usage selector
  const result = await materials.listMaterials(tenant.id)
  const allMaterials = result.materials

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add Piece</h1>
        <p className="mt-2 text-gray-600">Create a new piece with material tracking</p>
      </div>

      <PieceForm tenantId={tenant.id} availableMaterials={allMaterials} />
    </div>
  )
}
