import { requireTenant } from '@/lib/session'
import { orders } from '@madebuy/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, MapPin, CreditCard, User, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShippingActions } from './ShippingActions'

interface OrderDetailPageProps {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const tenant = await requireTenant()
  const order = await orders.getOrder(tenant.id, params.id)

  if (!order) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-400" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
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
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    {item.category && (
                      <p className="text-xs text-gray-400">{item.category}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity, order.currency)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.price, order.currency)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping ({order.shippingMethod})</span>
                  <span>{formatCurrency(order.shipping, order.currency)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount, order.currency)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(order.tax, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Shipping Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Ship To</h3>
                <p className="text-gray-900">{order.customerName}</p>
                <p className="text-sm text-gray-600">{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && (
                  <p className="text-sm text-gray-600">{order.shippingAddress.line2}</p>
                )}
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}
                </p>
                <p className="text-sm text-gray-600">{order.shippingAddress.country}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Shipping Method</h3>
                <p className="text-gray-900">{order.shippingMethod}</p>
                <p className="text-sm text-gray-500 capitalize">{order.shippingType}</p>

                {order.trackingNumber && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tracking</h3>
                    <p className="text-gray-900">{order.trackingNumber}</p>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Track Package
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <ShippingActions
                orderId={order.id}
                orderStatus={order.status}
                paymentStatus={order.paymentStatus}
                isDigitalOnly={order.isDigitalOnly || false}
                hasLabel={!!order.sendleOrderId}
                labelUrl={order.labelUrl}
                trackingNumber={order.sendleReference}
              />
            </div>
          </div>

          {/* Notes */}
          {(order.customerNotes || order.adminNotes) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Notes
              </h2>
              {order.customerNotes && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Customer Notes</h3>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">{order.customerNotes}</p>
                </div>
              )}
              {order.adminNotes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Admin Notes</h3>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">{order.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              Customer
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{order.customerName}</p>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {order.customerEmail}
                </a>
              </div>
              {order.customerPhone && (
                <div>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {order.customerPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              Payment
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Method</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              {order.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid</span>
                  <span>{formatDate(order.paidAt)}</span>
                </div>
              )}
              {order.fees && (
                <>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Processing Fee</span>
                      <span>{formatCurrency(order.fees.stripe, order.currency)}</span>
                    </div>
                    {order.netAmount && (
                      <div className="flex justify-between text-sm font-medium mt-1">
                        <span className="text-gray-900">Net Amount</span>
                        <span className="text-green-600">{formatCurrency(order.netAmount, order.currency)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <TimelineItem
                date={order.createdAt}
                label="Order placed"
                active
              />
              {order.paidAt && (
                <TimelineItem
                  date={order.paidAt}
                  label="Payment received"
                  active
                />
              )}
              {order.shippedAt && (
                <TimelineItem
                  date={order.shippedAt}
                  label="Shipped"
                  active
                />
              )}
              {order.deliveredAt && (
                <TimelineItem
                  date={order.deliveredAt}
                  label="Delivered"
                  active
                />
              )}
              {order.cancelledAt && (
                <TimelineItem
                  date={order.cancelledAt}
                  label="Cancelled"
                  active
                  variant="error"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({
  date,
  label,
  active,
  variant = 'success'
}: {
  date: Date
  label: string
  active?: boolean
  variant?: 'success' | 'error'
}) {
  const dotColor = variant === 'error' ? 'bg-red-500' : 'bg-green-500'

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1.5 h-2 w-2 rounded-full ${active ? dotColor : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{formatDate(date)}</p>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  )
}
