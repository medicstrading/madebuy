import { messages, orders, tenants } from '@madebuy/db'
import type { CreateMessageInput } from '@madebuy/shared'
import { createRateLimiter } from '@madebuy/shared'
import * as crypto from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { sendMessageNotificationEmail } from '@/lib/email-notifications'

// Rate limiter for customer messages: 10 per 15 minutes per token
const messageLimiter = createRateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 10,
})

/**
 * Hash customer email for senderId
 */
function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex')
    .substring(0, 16)
}

/**
 * GET /api/orders/[orderId]/messages?token=xxx
 * List messages for customer (requires valid access token)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 },
      )
    }

    // Validate access token
    const accessToken = await messages.validateOrderAccessToken(token)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 },
      )
    }

    // Verify order ID matches token
    if (accessToken.orderId !== params.orderId) {
      return NextResponse.json(
        { error: 'Token does not match order' },
        { status: 403 },
      )
    }

    // Get message thread (viewing as customer)
    const thread = await messages.getMessageThread(
      accessToken.tenantId,
      params.orderId,
      'customer',
    )

    // Mark seller messages as read when customer views
    if (thread.unreadCount > 0) {
      await messages.markAllAsReadForOrder(
        accessToken.tenantId,
        params.orderId,
        'seller',
      )
    }

    return NextResponse.json({
      messages: thread.messages,
      unreadCount: thread.unreadCount,
      lastMessageAt: thread.lastMessageAt,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/orders/[orderId]/messages?token=xxx
 * Send a message as the customer (requires valid access token)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 },
      )
    }

    // Validate access token
    const accessToken = await messages.validateOrderAccessToken(token)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 },
      )
    }

    // Verify order ID matches token
    if (accessToken.orderId !== params.orderId) {
      return NextResponse.json(
        { error: 'Token does not match order' },
        { status: 403 },
      )
    }

    // Rate limit check using token as identifier
    const rateLimitResult = await messageLimiter.check(token)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many messages',
          message:
            'Rate limit exceeded. Please wait before sending more messages.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      )
    }

    const data: CreateMessageInput = await request.json()

    // Validate content
    if (!data.content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 },
      )
    }

    // Limit message length
    if (data.content.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long (max 5000 characters)' },
        { status: 400 },
      )
    }

    // Get order for customer name
    const order = await orders.getOrder(accessToken.tenantId, params.orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create message as customer
    const message = await messages.createMessage(
      accessToken.tenantId,
      params.orderId,
      {
        content: data.content.trim(),
        attachments: data.attachments,
        senderId: hashEmail(accessToken.customerEmail),
        senderType: 'customer',
        senderName: order.customerName || 'Customer',
      },
    )

    // Send email notification to seller
    try {
      const tenant = await tenants.getTenantById(accessToken.tenantId)
      if (tenant) {
        await sendMessageNotificationEmail({
          order,
          tenant,
          message,
          recipientType: 'seller',
        })
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Failed to send message notification email:', emailError)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
