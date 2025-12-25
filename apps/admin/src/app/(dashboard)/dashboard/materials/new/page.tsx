import { requireTenant } from '@/lib/session'
import { MaterialForm } from '@/components/materials/MaterialForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewMaterialPage() {
  const tenant = await requireTenant()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/materials"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Materials
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add Material</h1>
        <p className="mt-2 text-gray-600">Add a new material to your inventory</p>
      </div>

      <MaterialForm tenantId={tenant.id} />
    </div>
  )
}
