/**
 * Message - Buyer-seller messaging for orders
 */

export interface Message {
  id: string
  tenantId: string
  orderId: string
  senderId: string // tenant.id or customer email hash
  senderType: 'seller' | 'customer'
  senderName: string
  content: string
  attachments?: MessageAttachment[]
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MessageAttachment {
  name: string
  url: string
  type: string // mime type
  sizeBytes?: number
}

export interface CreateMessageInput {
  orderId: string
  content: string
  attachments?: MessageAttachment[]
}

export interface MessageThread {
  messages: Message[]
  unreadCount: number
  lastMessageAt?: Date
}

/**
 * Token for customer order access without login
 * Stored in order record, sent via email link
 */
export interface OrderAccessToken {
  orderId: string
  tenantId: string
  customerEmail: string
  token: string
  expiresAt: Date
  createdAt: Date
}
