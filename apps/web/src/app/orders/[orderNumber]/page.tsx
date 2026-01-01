import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  ExternalLink,
  Download,
  MessageCircle,
  ChevronRight,
  Store,
  MapPin,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { orders, shipments, tenants } from '@madebuy/db'
import { TrackingStatus } from '@/components/tracking/TrackingStatus'
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline'
import {
  CARRIER_NAMES,
  type ShipmentStatus,
} from '@madebuy/shared'

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<{ email?: string }>
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { orderNumber } = await params

  return {
    title: `Order ${orderNumber} | MadeBuy`,
    description: `View your order details and shipping status.`,
    robots: { index: false, follow: false },
  }
}

/**
 * Look up order by order number
 * Uses global order lookup since orders have unique order numbers
 */
async function findOrder(orderNumber: string, email?: string) {
  // Look up order globally (order numbers are unique across tenants)
  const order = await orders.getOrderByOrderNumber(orderNumber)

  if (!order) {
    return null
  }

  // If email is provided, verify it matches (for security)
  if (email && order.customerEmail.toLowerCase() !== email.toLowerCase()) {
    return null
  }

  // Get tenant info
  const tenant = await tenants.getTenantById(order.tenantId)
  if (!tenant) {
    return null
  }

  return { order, tenant }
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { orderNumber } = await params
  const { email } = await searchParams

  // Validate order number
  if (!orderNumber || orderNumber.length < 5) {
    notFound()
  }

  // Find order
  const result = await findOrder(orderNumber, email)

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
            <p className="mt-2 text-gray-600">
              We couldn&apos;t find an order with number{' '}
              <span className="font-mono font-medium">{orderNumber}</span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Looking for your order?</h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">1.</span>
                Check your order confirmation email for the correct order number
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">2.</span>
                Make sure you&apos;re using the email address you used to place the order
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">3.</span>
                Contact the seller if you need assistance
              </li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const { order, tenant } = result

  // Get shipment if exists
  const shipment = await shipments.getShipmentByOrder(tenant.id, order.id)

  // Format dates
  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Prepare tracking events if shipment exists
  const trackingEvents = shipment?.trackingEvents?.map((event) => ({
    timestamp: event.timestamp instanceof Date
      ? event.timestamp.toISOString()
      : String(event.timestamp),
    status: event.status as ShipmentStatus,
    description: event.description,
    location: event.location,
  })) || []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-purple-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Order {order.orderNumber}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order {order.orderNumber}
              </h1>
              <p className="mt-1 text-gray-600">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/${tenant.slug}`}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Store className="h-4 w-4" />
                {tenant.businessName}
              </Link>
            </div>
          </div>
        </div>

        {/* Shipping Status */}
        {shipment && shipment.trackingNumber && (
          <div className="mb-6">
            <TrackingStatus
              status={shipment.status as ShipmentStatus}
              estimatedDelivery={
                shipment.estimatedDeliveryDate?.toISOString() ||
                shipment.estimatedDelivery?.toISOString()
              }
              estimatedDeliveryRange={
                shipment.estimatedDeliveryRange
                  ? [
                      shipment.estimatedDeliveryRange[0].toISOString(),
                      shipment.estimatedDeliveryRange[1].toISOString(),
                    ]
                  : undefined
              }
            />

            {/* Tracking Link */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm text-gray-500">Tracking Number</p>
                <p className="font-mono font-medium">{shipment.trackingNumber}</p>
              </div>
              <Link
                href={`/tracking/${shipment.trackingNumber}`}
                className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Track Package
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Order Status (when no shipment yet) */}
        {(!shipment || !shipment.trackingNumber) && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {order.status === 'pending' && 'Order Received'}
                  {order.status === 'confirmed' && 'Order Confirmed'}
                  {order.status === 'processing' && 'Being Prepared'}
                  {order.status === 'cancelled' && 'Order Cancelled'}
                </p>
                <p className="text-sm text-gray-600">
                  {order.status === 'pending' && 'Awaiting confirmation from the seller'}
                  {order.status === 'confirmed' && 'The seller is preparing your order'}
                  {order.status === 'processing' && 'Your order is being prepared for shipment'}
                  {order.status === 'cancelled' && 'This order has been cancelled'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mb-6 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Items Ordered</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-4 p-6">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-lg object-cover bg-gray-100"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                    <p className="text-sm text-gray-500">
                      {Object.entries(item.variantAttributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>

                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${(item.price / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary and Shipping */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Order Summary */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${(order.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>
                  {order.shipping === 0 ? 'Free' : `$${(order.shipping / 100).toFixed(2)}`}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${(order.discount / 100).toFixed(2)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>${(order.tax / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>${(order.total / 100).toFixed(2)} {order.currency}</span>
              </div>
            </div>

            {order.paymentStatus === 'paid' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <CreditCard className="h-4 w-4" />
                <span>Paid</span>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.customerName}</p>
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

        {/* Tracking Timeline (if shipment exists) */}
        {shipment && trackingEvents.length > 0 && (
          <div className="mb-6">
            <TrackingTimeline
              events={trackingEvents}
              currentStatus={shipment.status as ShipmentStatus}
            />
          </div>
        )}

        {/* Actions */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Need Help?</h2>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${tenant.slug}/contact`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Seller
            </Link>

            {/* Download Receipt - placeholder */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Order placed with{' '}
            <Link
              href={`/${tenant.slug}`}
              className="text-purple-600 hover:text-purple-700"
            >
              {tenant.businessName}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
