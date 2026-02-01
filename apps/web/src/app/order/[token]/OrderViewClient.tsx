'use client'

import type { Message } from '@madebuy/shared'
import {
  CheckCircle,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Send,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface OrderItem {
  name: string
  quantity: number
  price: number
  imageUrl?: string
}

interface OrderData {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string
  shippingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    postcode: string
    country: string
  }
  shippingMethod: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  deliveredAt?: string
}

interface SellerData {
  name: string
  email: string
  slug: string
}

interface OrderViewClientProps {
  token: string
  order: OrderData
  seller: SellerData
  initialMessages: Message[]
}

export function OrderViewClient({
  token,
  order,
  seller,
  initialMessages,
}: OrderViewClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: order.currency || 'AUD',
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orders/${order.id}/messages?token=${token}`,
      )
      if (!response.ok) return
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }, [order.id, token])

  // Poll for new messages when message panel is open
  useEffect(() => {
    if (!showMessages) return
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages, showMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showMessages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [newMessage])

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/orders/${order.id}/messages?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newMessage.trim() }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'processing':
        return <Package className="h-5 w-5 text-purple-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Placed'
      case 'confirmed':
        return 'Confirmed'
      case 'processing':
        return 'Processing'
      case 'shipped':
        return 'Shipped'
      case 'delivered':
        return 'Delivered'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Order from {seller.name}</p>
              <h1 className="text-2xl font-bold text-gray-900">
                {order.orderNumber}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="font-medium capitalize">
                {getStatusLabel(order.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Progress
              </h2>
              <div className="space-y-4">
                <StatusStep
                  label="Order Placed"
                  date={order.createdAt}
                  completed
                  formatDate={formatDate}
                />
                {order.paidAt && (
                  <StatusStep
                    label="Payment Confirmed"
                    date={order.paidAt}
                    completed
                    formatDate={formatDate}
                  />
                )}
                {order.shippedAt && (
                  <StatusStep
                    label="Shipped"
                    date={order.shippedAt}
                    completed
                    formatDate={formatDate}
                  />
                )}
                {order.deliveredAt && (
                  <StatusStep
                    label="Delivered"
                    date={order.deliveredAt}
                    completed
                    formatDate={formatDate}
                  />
                )}
              </div>

              {/* Tracking Info */}
              {order.trackingNumber && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Tracking Information
                  </h3>
                  <p className="text-sm text-gray-600">
                    {order.carrier && <span>{order.carrier}: </span>}
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {order.trackingNumber}
                      </a>
                    ) : (
                      <span>{order.trackingNumber}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>{formatCurrency(order.shipping)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Shipping Address
              </h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.customerName}
                </p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && (
                  <p>{order.shippingAddress.line2}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postcode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            {/* Message Seller Button */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                Contact Seller
              </h2>
              <button
                onClick={() => setShowMessages(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                Message {seller.name}
                {messages.filter((m) => m.senderType === 'seller' && !m.isRead)
                  .length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {
                      messages.filter(
                        (m) => m.senderType === 'seller' && !m.isRead,
                      ).length
                    }
                  </span>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Have a question about your order? Send us a message.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessages && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowMessages(false)}
          />
          <div className="relative min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold">{seller.name}</span>
                </div>
                <button
                  onClick={() => setShowMessages(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">
                      Start a conversation about your order
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      sellerName={seller.name}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-3">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[40px] max-h-[150px]"
                    rows={1}
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusStep({
  label,
  date,
  completed,
  formatDate,
}: {
  label: string
  date: string
  completed: boolean
  formatDate: (date: string) => string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 h-3 w-3 rounded-full ${completed ? 'bg-green-500' : 'bg-gray-300'}`}
      />
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{formatDate(date)}</p>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  sellerName,
}: {
  message: Message
  sellerName: string
}) {
  const isSeller = message.senderType === 'seller'
  const formattedDate = new Date(message.createdAt).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isSeller ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isSeller ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'
        }`}
      >
        <div
          className={`flex items-center gap-2 mb-1 text-xs ${
            isSeller ? 'text-gray-500' : 'text-blue-100'
          }`}
        >
          <span className="font-medium">{isSeller ? sellerName : 'You'}</span>
          <span>-</span>
          <span>{formattedDate}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  )
}
