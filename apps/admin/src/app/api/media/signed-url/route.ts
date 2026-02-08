import { getSignedUrl } from '@madebuy/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 },
      )
    }

    // DB-14: Validate R2 key prefix matches authenticated tenant ID
    // R2 keys are formatted as "{tenantId}/{nanoid}-{filename}"
    if (typeof key !== 'string' || !key.startsWith(`${tenant.id}/`)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 },
      )
    }

    // Generate signed URL with 1 hour expiration
    const signedUrl = await getSignedUrl(key, 3600)

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 },
    )
  }
}
