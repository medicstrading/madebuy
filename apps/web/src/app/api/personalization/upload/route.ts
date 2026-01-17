import type { PersonalizationField } from '@madebuy/shared'
import { uploadToR2 } from '@madebuy/storage'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'

// Allowed file types for personalization uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * POST /api/personalization/upload
 * Handle file uploads for personalization fields
 * Uploads to R2 storage and returns the public URL
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const pieceId = formData.get('pieceId') as string | null
    const fieldId = formData.get('fieldId') as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!pieceId) {
      return NextResponse.json(
        { error: 'Piece ID is required' },
        { status: 400 },
      )
    }

    if (!fieldId) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 },
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: `Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      )
    }

    // Get the piece to verify it exists and get tenantId
    // We need to search across all tenants since we don't have tenant context in web app
    // This is a bit inefficient, but safer
    const piece = await findPieceById(pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Verify the field exists in the piece's personalization config
    const config = piece.personalization
    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: 'Personalization is not enabled for this piece' },
        { status: 400 },
      )
    }

    const field = config.fields.find(
      (f: PersonalizationField) => f.id === fieldId,
    )
    if (!field) {
      return NextResponse.json(
        { error: 'Field not found in personalization config' },
        { status: 400 },
      )
    }

    if (field.type !== 'file') {
      return NextResponse.json(
        { error: 'Field is not a file upload field' },
        { status: 400 },
      )
    }

    // Check field-specific file type restrictions
    if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
      const isTypeAllowed = field.acceptedFileTypes.some((type: string) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'))
        }
        return file.type === type
      })

      if (!isTypeAllowed) {
        return NextResponse.json(
          {
            error: 'File type not allowed',
            message: `Allowed types: ${field.acceptedFileTypes.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    // Check field-specific file size restrictions
    if (field.maxFileSizeMB) {
      const maxBytes = field.maxFileSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        return NextResponse.json(
          {
            error: 'File too large',
            message: `Maximum file size for this field is ${field.maxFileSizeMB}MB`,
          },
          { status: 400 },
        )
      }
    }

    // Generate safe filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeFileName = `${nanoid(16)}.${fileExtension}`
    const _storageKey = `personalization/${piece.tenantId}/${pieceId}/${fieldId}/${safeFileName}`

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const uploadResult = await uploadToR2({
      tenantId: piece.tenantId,
      fileName: `personalization/${pieceId}/${fieldId}/${safeFileName}`,
      buffer,
      contentType: file.type,
      metadata: {
        originalName: file.name,
        pieceId,
        fieldId,
        uploadedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Personalization upload error:', error)

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * Find a piece by ID - only returns pieces that are publicly available
 * This is used when we don't have tenant context (buyer upload)
 * Security: Only returns pieces with status 'available' to prevent IDOR
 */
async function findPieceById(pieceId: string) {
  // Validate pieceId format to prevent injection
  if (!pieceId || typeof pieceId !== 'string' || pieceId.length > 50) {
    return null
  }

  const { getDatabase } = await import('@madebuy/db')
  const db = await getDatabase()

  // Only allow uploads to pieces that are publicly available
  // This prevents attackers from uploading to draft/hidden pieces
  const piece = await db.collection('pieces').findOne({
    id: pieceId,
    status: 'available', // Must be publicly available
    'personalization.enabled': true, // Must have personalization enabled
  })
  return piece as any
}
