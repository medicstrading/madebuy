import { pieces } from '@madebuy/db'
import { safeValidatePersonalizationConfig } from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

/**
 * GET /api/pieces/[id]/personalization
 * Get the personalization configuration for a piece
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Return the personalization config (or default empty config)
    const config = piece.personalization || {
      enabled: false,
      fields: [],
      previewEnabled: false,
      processingDays: 0,
      instructions: '',
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Get personalization config error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get personalization configuration' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/pieces/[id]/personalization
 * Update the personalization configuration for a piece
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id
    const body = await request.json()

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Validate the personalization config
    const validation = safeValidatePersonalizationConfig(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid personalization configuration',
          details: validation.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      )
    }

    const config = validation.data

    // Ensure all fields have valid IDs
    const fieldsWithIds = config.fields.map((field) => ({
      ...field,
      id: field.id || nanoid(10),
    }))

    // Update the piece with the new personalization config
    await pieces.updatePiece(tenant.id, pieceId, {
      personalization: {
        ...config,
        fields: fieldsWithIds,
      },
      // Also update legacy fields for backwards compatibility
      personalizationEnabled: config.enabled,
      personalizationFields: fieldsWithIds,
    })

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        fields: fieldsWithIds,
      },
    })
  } catch (error) {
    console.error('Update personalization config error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update personalization configuration' },
      { status: 500 },
    )
  }
}
