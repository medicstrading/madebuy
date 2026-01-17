import { reviews } from '@madebuy/db'
import type { ReviewModerationInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if review exists and belongs to this tenant
    const existingReview = await reviews.getReview(tenant.id, params.id)
    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Parse the moderation input
    const formData = await request.formData()
    const status = formData.get('status') as string
    const sellerResponse = formData.get('sellerResponse') as string | null

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const moderation: ReviewModerationInput = {
      status: status as 'approved' | 'rejected',
      sellerResponse: sellerResponse || undefined,
    }

    const _updatedReview = await reviews.moderateReview(
      tenant.id,
      params.id,
      moderation,
    )

    // Redirect back to reviews page
    return NextResponse.redirect(new URL('/dashboard/reviews', request.url))
  } catch (error) {
    console.error('Error moderating review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
