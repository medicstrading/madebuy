import { messages, orders } from '@madebuy/db'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageThread } from '@/components/orders/MessageThread'
import { requireTenant } from '@/lib/session'

interface OrderMessagesPageProps {
  params: { id: string }
}

export default async function OrderMessagesPage({
  params,
}: OrderMessagesPageProps) {
  const tenant = await requireTenant()
  const order = await orders.getOrder(tenant.id, params.id)

  if (!order) {
    notFound()
  }

  // Pre-fetch messages and mark customer messages as read
  const thread = await messages.getMessageThread(tenant.id, params.id, 'seller')
  if (thread.unreadCount > 0) {
    await messages.markAllAsReadForOrder(tenant.id, params.id, 'customer')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/orders/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Link>

        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Messages - {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Conversation with {order.customerName} ({order.customerEmail})
            </p>
          </div>
        </div>
      </div>

      {/* Message Thread */}
      <div className="bg-white rounded-lg shadow">
        <MessageThread orderId={params.id} initialMessages={thread.messages} />
      </div>

      {/* Order Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Order Summary
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Order:</span>{' '}
            <span className="font-medium">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className="font-medium capitalize">{order.status}</span>
          </div>
          <div>
            <span className="text-gray-500">Items:</span>{' '}
            <span className="font-medium">{order.items.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Total:</span>{' '}
            <span className="font-medium">
              ${(order.total / 100).toFixed(2)} {order.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
