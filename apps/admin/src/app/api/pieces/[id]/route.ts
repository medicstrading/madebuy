import { pieces } from '@madebuy/db'
import { safeValidateUpdatePiece, sanitizeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id
    const body = await request.json()

    // Check if piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Validate with Zod
    const validation = safeValidateUpdatePiece(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const updates = validation.data

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      )
    }

    // Sanitize text fields
    const sanitizedUpdates = {
      ...updates,
      name: updates.name ? sanitizeInput(updates.name) : undefined,
      description: updates.description
        ? sanitizeInput(updates.description)
        : undefined,
      category: updates.category ? sanitizeInput(updates.category) : undefined,
    }

    // Remove undefined fields
    const cleanedUpdates = Object.fromEntries(
      Object.entries(sanitizedUpdates).filter(([_, v]) => v !== undefined),
    )

    // Update the piece
    await pieces.updatePiece(tenant.id, pieceId, cleanedUpdates)

    // Get updated piece
    const updatedPiece = await pieces.getPiece(tenant.id, pieceId)

    return NextResponse.json({ piece: updatedPiece })
  } catch (error) {
    console.error('Update piece error:', error)
    return NextResponse.json(
      { error: 'Failed to update piece' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Check if piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Delete the piece
    await pieces.deletePiece(tenant.id, pieceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete piece error:', error)
    return NextResponse.json(
      { error: 'Failed to delete piece' },
      { status: 500 },
    )
  }
}
