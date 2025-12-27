import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * POST /api/marketplace/disputes
 * Create a dispute (48-hour resolution window)
 *
 * Body:
 * {
 *   orderId: string
 *   buyerId: string (customer email or ID)
 *   sellerId: string (tenantId)
 *   claimType: 'damage' | 'not_as_described' | 'not_received' | 'wrong_item' | 'quality_issue'
 *   description: string
 *   photos: string[] (mediaIds)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.orderId || !body.buyerId || !body.sellerId || !body.claimType || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate claim type
    const validClaimTypes = ['damage', 'not_as_described', 'not_received', 'wrong_item', 'quality_issue']
    if (!validClaimTypes.includes(body.claimType)) {
      return NextResponse.json(
        { error: 'Invalid claim type' },
        { status: 400 }
      )
    }

    // TODO: Verify order exists and belongs to buyer
    // - Check that orderId exists
    // - Check that buyerId matches order customer
    // - Check that sellerId matches order tenant
    // - Check that order is completed/delivered (can't dispute pending orders)

    const resolutionDeadline = new Date()
    resolutionDeadline.setHours(resolutionDeadline.getHours() + 48) // 48-hour window

    const dispute = await marketplace.createDispute({
      orderId: body.orderId,
      buyerId: body.buyerId,
      sellerId: body.sellerId,
      claimType: body.claimType,
      status: 'open',
      resolutionDeadline,
      buyerEvidence: {
        description: body.description,
        photos: body.photos || [],
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      dispute,
    })
  } catch (error) {
    console.error('Error creating dispute:', error)
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/disputes
 * List disputes for buyer or seller
 *
 * Query params:
 * - buyerId?: string
 * - sellerId?: string
 * - status?: string
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const buyerId = searchParams.get('buyerId')
    const sellerId = searchParams.get('sellerId')
    const status = searchParams.get('status') as any

    let disputes

    if (buyerId) {
      disputes = await marketplace.listBuyerDisputes(buyerId)
    } else if (sellerId) {
      disputes = await marketplace.listSellerDisputes(sellerId, status)
    } else {
      return NextResponse.json(
        { error: 'buyerId or sellerId is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({ disputes })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    )
  }
}
