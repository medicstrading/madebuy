/**
 * Ship Order Page
 * - Order details
 * - Package configuration
 * - Shipping method selection
 * - Book shipment button
 */

import { requireTenant } from '@/lib/session'
import { orders, shipments, tenants } from '@madebuy/db'
import { notFound, redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Package, MapPin, User, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { BookShipment } from '@/components/fulfillment/BookShipment'
import { ManualShipment } from '@/components/fulfillment/ManualShipment'
import { PrintLabel } from '@/components/fulfillment/PrintLabel'

interface Props {
  params: Promise<{ orderId: string }>
}

export default async function ShipOrderPage({ params }: Props) {
  const { orderId } = await params
  const tenant = await requireTenant()

  const order = await orders.getOrder(tenant.id, orderId)

  if (!order) {
    notFound()
  }

  // Check if already shipped
  const existingShipment = await shipments.getShipmentByOrder(tenant.id, orderId)

  // Get tenant for pickup address
  const tenantData = await tenants.getTenantById(tenant.id)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/fulfillment"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fulfillment
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Ship Order {order.orderNumber}</h1>
        <p className="mt-2 text-gray-600">
          {order.status === 'shipped' ? 'This order has been shipped' : 'Prepare and book shipment for this order'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Details - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                        <p className="text-sm text-gray-500">
                          {Object.entries(item.variantAttributes).map(([key, value]) => `${key}: ${value}`).join(', ')}
                        </p>
                      )}
                      {item.personalizations && item.personalizations.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          {item.personalizations.map((p, i) => (
                            <p key={i}>{p.fieldName}: {p.value}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity, order.currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">{formatCurrency(order.shipping, order.currency)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">{formatCurrency(order.tax, order.currency)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-{formatCurrency(order.discount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(order.total, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Section */}
          {existingShipment ? (
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
              </div>
              <div className="p-6">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
                  <p className="text-sm text-green-800">
                    This order has been booked with {existingShipment.carrier === 'sendle' ? 'Sendle' : existingShipment.carrier}.
                    {existingShipment.trackingNumber && ` Tracking: ${existingShipment.trackingNumber}`}
                  </p>
                </div>

                {existingShipment.labelUrl && (
                  <PrintLabel shipment={existingShipment} />
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="mt-1 text-gray-900 capitalize">{existingShipment.status.replace('_', ' ')}</p>
                  </div>
                  {existingShipment.trackingNumber && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tracking Number</p>
                      <p className="mt-1 text-gray-900 font-mono">{existingShipment.trackingNumber}</p>
                    </div>
                  )}
                  {existingShipment.shippedAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Shipped At</p>
                      <p className="mt-1 text-gray-900">{formatDate(existingShipment.shippedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Book with Sendle */}
              <BookShipment order={order} />

              {/* Manual Shipment */}
              <ManualShipment orderId={order.id} />
            </>
          )}
        </div>

        {/* Customer & Shipping Info - Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <a href={`mailto:${order.customerEmail}`} className="text-blue-600 hover:underline">
                    {order.customerEmail}
                  </a>
                </div>
              </div>
              {order.customerPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">
                      {order.customerPhone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="text-gray-900">
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Order Info</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Order Number</p>
                <p className="mt-1 text-gray-900">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Order Date</p>
                <p className="mt-1 text-gray-900">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Status</p>
                <p className="mt-1">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    order.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Shipping Method</p>
                <p className="mt-1 text-gray-900">{order.shippingMethod}</p>
              </div>
              {order.customerNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer Notes</p>
                  <p className="mt-1 text-gray-900 text-sm">{order.customerNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
