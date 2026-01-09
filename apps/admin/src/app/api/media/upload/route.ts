import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { uploadToR2, uploadToLocal, processImageWithVariants } from '@madebuy/storage'

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true'

// Magic number (file signature) definitions for security verification
const MAGIC_NUMBERS: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/jpg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  // Note: WebP handled separately in verifyMagicNumber due to RIFF+WEBP check
}

// Video magic numbers
const VIDEO_MAGIC_NUMBERS: Record<string, number[][]> = {
  'video/mp4': [
    [0x00, 0x00, 0x00], // ftyp box (starts at offset 4)
    [0x66, 0x74, 0x79, 0x70], // 'ftyp' at offset 4
  ],
  'video/quicktime': [
    [0x00, 0x00, 0x00], // moov/ftyp box
  ],
}

/**
 * Verify file content matches claimed MIME type via magic number check
 * Prevents malicious files disguised with fake extensions
 */
function verifyMagicNumber(buffer: Buffer, mimeType: string): boolean {
  // Check image magic numbers
  const expectedBytes = MAGIC_NUMBERS[mimeType]
  if (expectedBytes) {
    return expectedBytes.every((byte, i) => buffer[i] === byte)
  }

  // WebP requires special handling - RIFF header shared with AVI (P3 fix)
  // WebP format: RIFF....WEBP where .... is file size
  if (mimeType === 'image/webp') {
    const riffSignature = [0x52, 0x49, 0x46, 0x46] // 'RIFF' at offset 0
    const webpSignature = [0x57, 0x45, 0x42, 0x50] // 'WEBP' at offset 8
    const hasRiff = riffSignature.every((byte, i) => buffer[i] === byte)
    const hasWebp = webpSignature.every((byte, i) => buffer[i + 8] === byte)
    return hasRiff && hasWebp
  }

  // For video files, do a basic check (video containers are more complex)
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    // MP4/MOV files have 'ftyp' at offset 4
    const ftypSignature = [0x66, 0x74, 0x79, 0x70] // 'ftyp'
    return ftypSignature.every((byte, i) => buffer[i + 4] === byte)
  }

  // For AVI files
  if (mimeType === 'video/x-msvideo') {
    // AVI files start with 'RIFF....AVI '
    const riffSignature = [0x52, 0x49, 0x46, 0x46] // 'RIFF' at offset 0
    const aviSignature = [0x41, 0x56, 0x49, 0x20] // 'AVI ' at offset 8
    const hasRiff = riffSignature.every((byte, i) => buffer[i] === byte)
    const hasAvi = aviSignature.every((byte, i) => buffer[i + 8] === byte)
    return hasRiff && hasAvi
  }

  // Unknown type - allow by default (will be caught by other validations)
  return true
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file size (max 10MB for images, 100MB for videos)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
    const isVideoFile = file.type.startsWith('video/')
    const maxSize = isVideoFile ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeMB}MB for ${isVideoFile ? 'videos' : 'images'}` },
        { status: 400 }
      )
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

    const isImage = validImageTypes.includes(file.type)
    const isVideo = validVideoTypes.includes(file.type)

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const type = isImage ? 'image' : 'video'

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Verify magic number matches claimed MIME type (security check)
    if (!verifyMagicNumber(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match declared type' },
        { status: 400 }
      )
    }

    // Generate variants for images (if image)
    const variants = type === 'image'
      ? await processImageWithVariants({
          imageBuffer: buffer,
          fileName: file.name,
          tenantId: tenant.id,
        })
      : await (async () => {
          // For videos, just upload the original
          const uploadFn = USE_LOCAL_STORAGE ? uploadToLocal : uploadToR2
          const variant = await uploadFn({
            tenantId: tenant.id,
            fileName: `videos/${file.name}`,
            buffer,
            contentType: file.type,
          })
          return {
            original: variant,
          }
        })()

    // Create media record in database
    const mediaItem = await media.createMedia(tenant.id, {
      type,
      originalFilename: file.name,
      mimeType: file.type,
      variants,
      caption: caption || undefined,
    })

    return NextResponse.json({ media: mediaItem }, { status: 201 })
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
