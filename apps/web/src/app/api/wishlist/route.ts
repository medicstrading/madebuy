import { wishlist } from '@madebuy/db'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/wishlist
 * Get wishlist items for current user (by email or session)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const customerEmail = searchParams.get('email')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      )
    }

    // Get session ID from cookie for guest users
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('wishlist_session')?.value

    const items = await wishlist.getWishlist(
      tenantId,
      customerEmail || undefined,
      sessionId,
    )

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/wishlist
 * Add item to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, pieceId, customerEmail, variantId } = body

    if (!tenantId || !pieceId) {
      return NextResponse.json(
        { error: 'tenantId and pieceId are required' },
        { status: 400 },
      )
    }

    // For guest users, create or get session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get('wishlist_session')?.value

    // If no email and no session, create a session
    if (!customerEmail && !sessionId) {
      sessionId = nanoid()
    }

    const item = await wishlist.addToWishlist(tenantId, {
      pieceId,
      customerEmail: customerEmail || undefined,
      sessionId: customerEmail ? undefined : sessionId,
      variantId,
    })

    // Set session cookie for guests
    const response = NextResponse.json({ item }, { status: 201 })

    if (!customerEmail && sessionId) {
      response.cookies.set('wishlist_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return response
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/wishlist
 * Remove item from wishlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const pieceId = searchParams.get('pieceId')
    const customerEmail = searchParams.get('email')

    if (!tenantId || !pieceId) {
      return NextResponse.json(
        { error: 'tenantId and pieceId are required' },
        { status: 400 },
      )
    }

    // Get session ID from cookie for guest users
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('wishlist_session')?.value

    // Customer isolation: Can only delete their own items
    // - If email provided, only matches items with that email
    // - If session provided, only matches items with that session
    const removed = await wishlist.removeFromWishlist(
      tenantId,
      pieceId,
      customerEmail || undefined,
      customerEmail ? undefined : sessionId,
    )

    if (!removed) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 },
    )
  }
}
