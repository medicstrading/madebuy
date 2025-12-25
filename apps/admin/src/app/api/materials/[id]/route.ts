import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { materials } from '@madebuy/db'
import { UpdateMaterialInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const material = await materials.getMaterial(tenant.id, params.id)

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Error fetching material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdateMaterialInput = await request.json()

    // Check if material exists
    const existing = await materials.getMaterial(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    // Update the material
    await materials.updateMaterial(tenant.id, params.id, data)

    // Fetch updated material
    const material = await materials.getMaterial(tenant.id, params.id)

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if material exists
    const existing = await materials.getMaterial(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    await materials.deleteMaterial(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
