import { pieces } from '@madebuy/db'
import type { DigitalProductConfig } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/pieces/[id]/digital
 * Get digital product configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const digital = piece.digital || {
      isDigital: false,
      files: [],
      instantDelivery: true,
      emailDelivery: true,
    }

    return NextResponse.json({ digital })
  } catch (error) {
    console.error('Error getting digital config:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/pieces/[id]/digital
 * Update digital product configuration (not files - use /files endpoint)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate input
    const {
      isDigital,
      downloadLimit,
      downloadExpiryDays,
      instantDelivery,
      emailDelivery,
      licenseType,
      licenseText,
    } = body

    // Validate downloadLimit
    if (downloadLimit !== undefined && downloadLimit !== null) {
      if (typeof downloadLimit !== 'number' || downloadLimit < 1) {
        return NextResponse.json(
          { error: 'downloadLimit must be a positive number or null' },
          { status: 400 },
        )
      }
    }

    // Validate downloadExpiryDays
    if (downloadExpiryDays !== undefined && downloadExpiryDays !== null) {
      if (typeof downloadExpiryDays !== 'number' || downloadExpiryDays < 1) {
        return NextResponse.json(
          { error: 'downloadExpiryDays must be a positive number or null' },
          { status: 400 },
        )
      }
    }

    // Validate licenseType
    if (licenseType !== undefined && licenseType !== null) {
      if (!['personal', 'commercial', 'extended'].includes(licenseType)) {
        return NextResponse.json(
          {
            error:
              'licenseType must be personal, commercial, extended, or null',
          },
          { status: 400 },
        )
      }
    }

    // Build updated config
    const currentDigital = piece.digital || {
      isDigital: false,
      files: [],
      instantDelivery: true,
      emailDelivery: true,
    }

    const updatedDigital: DigitalProductConfig = {
      ...currentDigital,
      isDigital: isDigital !== undefined ? isDigital : currentDigital.isDigital,
      downloadLimit:
        downloadLimit !== undefined
          ? downloadLimit
          : currentDigital.downloadLimit,
      downloadExpiryDays:
        downloadExpiryDays !== undefined
          ? downloadExpiryDays
          : currentDigital.downloadExpiryDays,
      instantDelivery:
        instantDelivery !== undefined
          ? instantDelivery
          : currentDigital.instantDelivery,
      emailDelivery:
        emailDelivery !== undefined
          ? emailDelivery
          : currentDigital.emailDelivery,
      licenseType:
        licenseType !== undefined ? licenseType : currentDigital.licenseType,
      licenseText:
        licenseText !== undefined ? licenseText : currentDigital.licenseText,
    }

    await pieces.updatePiece(tenant.id, pieceId, {
      digital: updatedDigital,
    })

    return NextResponse.json({ digital: updatedDigital })
  } catch (error) {
    console.error('Error updating digital config:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/pieces/[id]/digital
 * Remove digital product configuration (converts back to physical product)
 * Note: This does NOT delete the files from storage
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Keep files but mark as not digital
    // This allows recovering files if they change their mind
    const currentDigital = piece.digital

    if (currentDigital) {
      await pieces.updatePiece(tenant.id, pieceId, {
        digital: {
          ...currentDigital,
          isDigital: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Digital product configuration disabled. Files preserved.',
    })
  } catch (error) {
    console.error('Error removing digital config:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
