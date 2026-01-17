import { materials } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const materialId = params.id

    // Check if material exists
    const material = await materials.getMaterial(tenant.id, materialId)
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    // Delete the material
    await materials.deleteMaterial(tenant.id, materialId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 },
    )
  }
}
