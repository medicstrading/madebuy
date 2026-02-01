import { messages, orders, tenants } from '@madebuy/db'
import type { CreateMessageInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { sendMessageNotificationEmail } from '@/lib/email-notifications'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/orders/[id]/messages
 * List all messages for an order
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify order belongs to tenant
    const order = await orders.getOrder(tenant.id, params.id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get message thread (viewing as seller)
    const thread = await messages.getMessageThread(
      tenant.id,
      params.id,
      'seller',
    )

    // Mark customer messages as read when seller views
    if (thread.unreadCount > 0) {
      await messages.markAllAsReadForOrder(tenant.id, params.id, 'customer')
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
 * POST /api/orders/[id]/messages
 * Send a message as the seller
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify order belongs to tenant
    const order = await orders.getOrder(tenant.id, params.id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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

    // Create message as seller
    const message = await messages.createMessage(tenant.id, params.id, {
      content: data.content.trim(),
      attachments: data.attachments,
      senderId: tenant.id,
      senderType: 'seller',
      senderName: tenant.businessName || 'Seller',
    })

    // Send email notification to customer
    try {
      await sendMessageNotificationEmail({
        order,
        tenant,
        message,
        recipientType: 'customer',
      })
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
