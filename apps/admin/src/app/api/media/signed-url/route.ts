import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { getSignedUrl } from '@madebuy/storage'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Generate signed URL with 1 hour expiration
    const signedUrl = await getSignedUrl(key, 3600)

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    )
  }
}
