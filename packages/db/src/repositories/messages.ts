import type {
  CreateMessageInput,
  Message,
  MessageThread,
  OrderAccessToken,
} from '@madebuy/shared'
import * as crypto from 'node:crypto'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/**
 * Create a new message in an order thread
 */
export async function createMessage(
  tenantId: string,
  orderId: string,
  data: Omit<CreateMessageInput, 'orderId'> & {
    senderId: string
    senderType: 'seller' | 'customer'
    senderName: string
  },
): Promise<Message> {
  const db = await getDatabase()

  const message: Message = {
    id: nanoid(),
    tenantId,
    orderId,
    senderId: data.senderId,
    senderType: data.senderType,
    senderName: data.senderName,
    content: data.content,
    attachments: data.attachments,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('messages').insertOne(message)
  return message
}

/**
 * List all messages for an order
 */
export async function listMessagesByOrder(
  tenantId: string,
  orderId: string,
): Promise<Message[]> {
  const db = await getDatabase()

  const results = await db
    .collection('messages')
    .find({ tenantId, orderId })
    .sort({ createdAt: 1 })
    .toArray()

  return results as unknown as Message[]
}

/**
 * Get message thread with unread count
 */
export async function getMessageThread(
  tenantId: string,
  orderId: string,
  viewerType: 'seller' | 'customer',
): Promise<MessageThread> {
  const db = await getDatabase()

  // Get all messages
  const messages = await db
    .collection('messages')
    .find({ tenantId, orderId })
    .sort({ createdAt: 1 })
    .toArray()

  // Count unread messages from the other party
  const otherType = viewerType === 'seller' ? 'customer' : 'seller'
  const unreadCount = (messages as unknown as Message[]).filter(
    (m) => m.senderType === otherType && !m.isRead,
  ).length

  // Get last message timestamp
  const lastMessageAt =
    messages.length > 0
      ? (messages[messages.length - 1] as unknown as Message).createdAt
      : undefined

  return {
    messages: messages as unknown as Message[],
    unreadCount,
    lastMessageAt,
  }
}

/**
 * Mark a single message as read
 */
export async function markAsRead(
  tenantId: string,
  messageId: string,
): Promise<void> {
  const db = await getDatabase()

  await db.collection('messages').updateOne(
    { tenantId, id: messageId },
    {
      $set: {
        isRead: true,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Mark all messages from one sender type as read
 * Used when seller views customer messages or vice versa
 */
export async function markAllAsReadForOrder(
  tenantId: string,
  orderId: string,
  senderType: 'seller' | 'customer',
): Promise<number> {
  const db = await getDatabase()

  const result = await db.collection('messages').updateMany(
    {
      tenantId,
      orderId,
      senderType, // Mark messages FROM this sender type as read
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        updatedAt: new Date(),
      },
    },
  )

  return result.modifiedCount
}

/**
 * Count unread messages for an order (from specific sender type)
 */
export async function countUnreadByOrder(
  tenantId: string,
  orderId: string,
  fromSenderType: 'seller' | 'customer',
): Promise<number> {
  const db = await getDatabase()

  return await db.collection('messages').countDocuments({
    tenantId,
    orderId,
    senderType: fromSenderType,
    isRead: false,
  })
}

/**
 * Count total unread customer messages for a tenant
 * Used for badge/notification count in admin dashboard
 */
export async function countUnreadForTenant(tenantId: string): Promise<number> {
  const db = await getDatabase()

  return await db.collection('messages').countDocuments({
    tenantId,
    senderType: 'customer', // Count unread messages FROM customers
    isRead: false,
  })
}

/**
 * Get unread message counts grouped by order
 */
export async function getUnreadCountsByOrder(
  tenantId: string,
): Promise<Map<string, number>> {
  const db = await getDatabase()

  const results = await db
    .collection('messages')
    .aggregate([
      {
        $match: {
          tenantId,
          senderType: 'customer',
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$orderId',
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const countMap = new Map<string, number>()
  for (const result of results) {
    countMap.set(result._id, result.count)
  }

  return countMap
}

// =============================================================================
// ORDER ACCESS TOKENS (for customer order page without login)
// =============================================================================

/**
 * Generate a secure access token for customer order view
 */
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create an order access token for a customer
 */
export async function createOrderAccessToken(
  tenantId: string,
  orderId: string,
  customerEmail: string,
  expiryDays: number = 30,
): Promise<OrderAccessToken> {
  const db = await getDatabase()

  // Check if token already exists for this order
  const existing = await db
    .collection('order_access_tokens')
    .findOne({ tenantId, orderId })

  if (existing) {
    // Return existing token if not expired
    const existingToken = existing as unknown as OrderAccessToken
    if (new Date() < new Date(existingToken.expiresAt)) {
      return existingToken
    }
    // Delete expired token
    await db.collection('order_access_tokens').deleteOne({ tenantId, orderId })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const accessToken: OrderAccessToken = {
    orderId,
    tenantId,
    customerEmail: customerEmail.toLowerCase(),
    token: generateAccessToken(),
    expiresAt,
    createdAt: new Date(),
  }

  await db.collection('order_access_tokens').insertOne(accessToken)
  return accessToken
}

/**
 * Validate an order access token
 */
export async function validateOrderAccessToken(
  token: string,
): Promise<OrderAccessToken | null> {
  const db = await getDatabase()

  const record = await db.collection('order_access_tokens').findOne({ token })

  if (!record) {
    return null
  }

  const accessToken = record as unknown as OrderAccessToken

  // Check expiration
  if (new Date() > new Date(accessToken.expiresAt)) {
    return null
  }

  return accessToken
}

/**
 * Get access token by order ID (for generating email links)
 */
export async function getOrderAccessToken(
  tenantId: string,
  orderId: string,
): Promise<OrderAccessToken | null> {
  const db = await getDatabase()

  const record = await db
    .collection('order_access_tokens')
    .findOne({ tenantId, orderId })

  if (!record) {
    return null
  }

  return record as unknown as OrderAccessToken
}

// =============================================================================
// INDEXES
// =============================================================================

/**
 * Ensure indexes exist (call on app startup)
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()

  // Messages indexes
  await db
    .collection('messages')
    .createIndex(
      { tenantId: 1, orderId: 1, createdAt: 1 },
      { background: true },
    )
  await db
    .collection('messages')
    .createIndex({ tenantId: 1, id: 1 }, { unique: true, background: true })
  await db
    .collection('messages')
    .createIndex(
      { tenantId: 1, senderType: 1, isRead: 1 },
      { background: true },
    )

  // Order access tokens indexes
  await db
    .collection('order_access_tokens')
    .createIndex({ token: 1 }, { unique: true, background: true })
  await db
    .collection('order_access_tokens')
    .createIndex(
      { tenantId: 1, orderId: 1 },
      { unique: true, background: true },
    )
  await db
    .collection('order_access_tokens')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
}
