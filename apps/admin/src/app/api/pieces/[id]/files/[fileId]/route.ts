import { pieces } from '@madebuy/db'
import type { UpdateDigitalFileInput } from '@madebuy/shared'
import { deleteFromR2, getSignedUrl } from '@madebuy/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/pieces/[id]/files/[fileId]
 * Get a specific digital file's details and signed download URL
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId, fileId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const file = piece.digital?.files?.find((f) => f.id === fileId)
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Generate signed URL for preview/download (10 minute expiry for admin)
    const signedUrl = await getSignedUrl(file.r2Key, 10 * 60)

    return NextResponse.json({
      file,
      signedUrl,
      signedUrlExpiresIn: 600, // 10 minutes
    })
  } catch (error) {
    console.error('Error getting digital file:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/pieces/[id]/files/[fileId]
 * Update a digital file's metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId, fileId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const currentFiles = piece.digital?.files || []
    const fileIndex = currentFiles.findIndex((f) => f.id === fileId)

    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const body = (await request.json()) as UpdateDigitalFileInput

    // Validate input
    if (body.name !== undefined && typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    if (
      body.description !== undefined &&
      typeof body.description !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid description' },
        { status: 400 },
      )
    }
    if (body.version !== undefined && typeof body.version !== 'string') {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
    }
    if (body.sortOrder !== undefined && typeof body.sortOrder !== 'number') {
      return NextResponse.json({ error: 'Invalid sortOrder' }, { status: 400 })
    }

    // Update file metadata
    const updatedFile = {
      ...currentFiles[fileIndex],
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.version !== undefined && { version: body.version }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      updatedAt: new Date(),
    }

    const updatedFiles = [...currentFiles]
    updatedFiles[fileIndex] = updatedFile

    await pieces.updatePiece(tenant.id, pieceId, {
      digital: {
        ...piece.digital!,
        files: updatedFiles,
      },
    })

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    console.error('Error updating digital file:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/pieces/[id]/files/[fileId]
 * Delete a digital file
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId, fileId } = await params
    const piece = await pieces.getPiece(tenant.id, pieceId)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const currentFiles = piece.digital?.files || []
    const file = currentFiles.find((f) => f.id === fileId)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from R2
    try {
      await deleteFromR2(file.r2Key)
    } catch (storageError) {
      console.error('Failed to delete file from R2:', storageError)
      // Continue with database deletion even if R2 delete fails
    }

    // Remove from piece
    const updatedFiles = currentFiles.filter((f) => f.id !== fileId)

    // Re-index sort orders
    const reindexedFiles = updatedFiles.map((f, i) => ({
      ...f,
      sortOrder: i,
    }))

    // Update piece
    const digitalConfig = piece.digital!
    const updateData: any = {
      digital: {
        ...digitalConfig,
        files: reindexedFiles,
      },
    }

    // If no files left, set isDigital to false
    if (reindexedFiles.length === 0) {
      updateData.digital.isDigital = false
    }

    await pieces.updatePiece(tenant.id, pieceId, updateData)

    return NextResponse.json({
      success: true,
      remainingFiles: reindexedFiles.length,
    })
  } catch (error) {
    console.error('Error deleting digital file:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
