import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { uploadToR2 } from '@madebuy/storage'
import type { DigitalFile, CreateDigitalFileInput } from '@madebuy/shared'

// Allowed file types for digital products
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',

  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',

  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'image/bmp',

  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',

  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',

  // Design files
  'application/postscript',
  'image/vnd.adobe.photoshop',

  // E-books
  'application/epub+zip',
  'application/x-mobipocket-ebook',

  // Fonts
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
])

// Max file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024

/**
 * GET /api/pieces/[id]/files
 * List all digital files for a piece
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const files = piece.digital?.files || []

    return NextResponse.json({
      files,
      totalCount: files.length,
      totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
    })
  } catch (error) {
    console.error('Error listing digital files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pieces/[id]/files
 * Upload a new digital file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const displayName = formData.get('name') as string | null
    const description = formData.get('description') as string | null
    const version = formData.get('version') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed for digital products.` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB).` },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique file ID and R2 key
    const fileId = nanoid()
    const r2Key = `digital/${tenant.id}/${pieceId}/${fileId}/${file.name}`

    // Upload to R2 (private bucket for digital files)
    await uploadToR2({
      tenantId: tenant.id,
      fileName: r2Key,
      buffer,
      contentType: file.type,
      metadata: {
        pieceId,
        fileId,
        originalName: file.name,
      },
    })

    // Create file record
    const now = new Date()
    const newFile: DigitalFile = {
      id: fileId,
      name: displayName || file.name.replace(/\.[^/.]+$/, ''), // Remove extension for display
      fileName: file.name,
      r2Key,
      sizeBytes: file.size,
      mimeType: file.type,
      description: description || undefined,
      version: version || undefined,
      sortOrder: (piece.digital?.files?.length || 0),
      createdAt: now,
      updatedAt: now,
    }

    // Update piece with new file
    const currentFiles = piece.digital?.files || []
    const digitalConfig = piece.digital || {
      isDigital: true,
      files: [],
      instantDelivery: true,
      emailDelivery: true,
    }

    await pieces.updatePiece(tenant.id, pieceId, {
      digital: {
        ...digitalConfig,
        isDigital: true,
        files: [...currentFiles, newFile],
      },
    })

    return NextResponse.json({ file: newFile }, { status: 201 })
  } catch (error) {
    console.error('Error uploading digital file:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/pieces/[id]/files
 * Reorder files
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { fileIds } = body as { fileIds: string[] }

    if (!Array.isArray(fileIds)) {
      return NextResponse.json({ error: 'fileIds array is required' }, { status: 400 })
    }

    const currentFiles = piece.digital?.files || []

    // Validate all file IDs exist
    const fileMap = new Map(currentFiles.map(f => [f.id, f]))
    for (const id of fileIds) {
      if (!fileMap.has(id)) {
        return NextResponse.json({ error: `File ${id} not found` }, { status: 400 })
      }
    }

    // Reorder files based on fileIds array
    const reorderedFiles = fileIds.map((id, index) => {
      const file = fileMap.get(id)!
      return { ...file, sortOrder: index, updatedAt: new Date() }
    })

    // Add any files not in fileIds at the end
    const reorderedIds = new Set(fileIds)
    const remainingFiles = currentFiles
      .filter(f => !reorderedIds.has(f.id))
      .map((f, i) => ({ ...f, sortOrder: fileIds.length + i }))

    const allFiles = [...reorderedFiles, ...remainingFiles]

    await pieces.updatePiece(tenant.id, pieceId, {
      digital: {
        ...piece.digital!,
        files: allFiles,
      },
    })

    return NextResponse.json({ files: allFiles })
  } catch (error) {
    console.error('Error reordering files:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
