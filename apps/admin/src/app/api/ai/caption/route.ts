import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { generateCaption } from '@madebuy/social'

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mediaIds, style, productName, productDescription, includeHashtags } = await request.json()

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'Media IDs required' }, { status: 400 })
    }

    // Get media files
    const mediaFiles = await Promise.all(
      mediaIds.map((id: string) => media.getMedia(tenant.id, id))
    )

    const validMediaFiles = mediaFiles.filter(m => m !== null)

    if (validMediaFiles.length === 0) {
      return NextResponse.json({ error: 'No valid media found' }, { status: 404 })
    }

    // Generate caption using AI
    const result = await generateCaption({
      mediaIds, // Required by interface but not used by implementation
      imageUrls: validMediaFiles.map(m => m!.variants.original.url),
      productName: productName || tenant.businessName,
      productDescription,
      style: style || 'professional',
      includeHashtags: includeHashtags !== false,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating caption:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
