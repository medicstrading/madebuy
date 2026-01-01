import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { uploadToR2, uploadToLocal } from '@madebuy/storage'
// Media constants
const VALID_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const
const MAX_VIDEO_SIZE = 100 * 1024 * 1024  // 100MB
const MAX_MEDIA_PER_PIECE = 20

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true'

/**
 * POST /api/media/video
 * Upload a video file
 *
 * Accepts multipart form data with:
 * - file: Video file (MP4, MOV, WebM)
 * - pieceId: (optional) Link to a piece
 * - caption: (optional) Video caption
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const pieceId = formData.get('pieceId') as string | null
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    if (!VALID_VIDEO_TYPES.includes(file.type as typeof VALID_VIDEO_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid file type. Supported formats: MP4, MOV, WebM` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // If linking to a piece, check media count limit
    if (pieceId) {
      const existingMedia = await media.listMedia(tenant.id, { pieceId })
      if (existingMedia.length >= MAX_MEDIA_PER_PIECE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_MEDIA_PER_PIECE} media items per piece` },
          { status: 400 }
        )
      }
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `videos/${timestamp}-${sanitizedName}`

    // Upload to storage (R2 or local)
    const uploadFn = USE_LOCAL_STORAGE ? uploadToLocal : uploadToR2
    const variant = await uploadFn({
      tenantId: tenant.id,
      fileName,
      buffer,
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Get display order for new media
    let displayOrder = 0
    if (pieceId) {
      const existingMedia = await media.listMedia(tenant.id, { pieceId })
      displayOrder = existingMedia.length
    }

    // Create media record with pending processing status
    const mediaItem = await media.createMedia(tenant.id, {
      type: 'video',
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      variants: {
        original: variant,
      },
      caption: caption || undefined,
      pieceId: pieceId || undefined,
      displayOrder,
      isPrimary: displayOrder === 0, // First item is primary by default
      processingStatus: 'pending', // Video needs thumbnail generation
    })

    return NextResponse.json(
      {
        media: mediaItem,
        message: 'Video uploaded successfully. Thumbnail will be generated shortly.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading video:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/media/video
 * Get videos with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pieceId = searchParams.get('pieceId')
    const processingStatus = searchParams.get('processingStatus')

    const filters: any = { type: 'video' }
    if (pieceId) filters.pieceId = pieceId
    if (processingStatus) filters.processingStatus = processingStatus

    const videos = await media.listMedia(tenant.id, filters)

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
