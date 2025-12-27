import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { uploadToR2, uploadToLocal, processImageWithVariants } from '@madebuy/storage'

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true'

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
