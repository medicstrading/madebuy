import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  ExternalLink,
  HelpCircle,
  Store,
} from 'lucide-react'
import { shipments, orders, tenants } from '@madebuy/db'
import { TrackingStatus } from '@/components/tracking/TrackingStatus'
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline'
import { TrackingLookup } from '@/components/tracking/TrackingLookup'
import {
  CARRIER_NAMES,
  SHIPMENT_STATUS_MESSAGES,
  type ShipmentStatus,
} from '@madebuy/shared'

interface TrackingPageProps {
  params: Promise<{ trackingNumber: string }>
}

export async function generateMetadata({ params }: TrackingPageProps): Promise<Metadata> {
  const { trackingNumber } = await params

  return {
    title: `Track Package ${trackingNumber} | MadeBuy`,
    description: `Track your package with tracking number ${trackingNumber}. View real-time shipping updates and delivery status.`,
    robots: { index: false, follow: false }, // Don't index tracking pages
    openGraph: {
      title: `Track Package ${trackingNumber}`,
      description: 'View real-time shipping updates and delivery status.',
      type: 'website',
    },
  }
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { trackingNumber } = await params

  // Validate tracking number format
  if (!trackingNumber || trackingNumber.length < 5) {
    notFound()
  }

  // Look up shipment by tracking number
  const shipment = await shipments.getShipmentByTrackingNumber(trackingNumber)

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Tracking Not Found</h1>
            <p className="mt-2 text-gray-600">
              We couldn&apos;t find a package with tracking number{' '}
              <span className="font-mono font-medium">{trackingNumber}</span>
            </p>
          </div>

          {/* Suggestions */}
          <div className="rounded-xl bg-white p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Things to try:</h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">1.</span>
                Double-check the tracking number for typos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">2.</span>
                Wait a few hours - tracking info may take time to appear
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">3.</span>
                Check your order confirmation email for the correct number
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">4.</span>
                Contact the seller if the issue persists
              </li>
            </ul>
          </div>

          {/* Try Again */}
          <TrackingLookup />
        </div>
      </div>
    )
  }

  // Get order and tenant info
  const order = await orders.getOrder(shipment.tenantId, shipment.orderId)
  const tenant = await tenants.getTenantById(shipment.tenantId)

  if (!order || !tenant) {
    notFound()
  }

  // Prepare tracking data
  const carrierName = CARRIER_NAMES[shipment.carrier] || shipment.carrier
  const statusMessage = SHIPMENT_STATUS_MESSAGES[shipment.status as ShipmentStatus] || 'Status unknown'

  // Get last 4 digits of order number for privacy
  const orderNumberLast4 = order.orderNumber?.slice(-4) || order.id.slice(-4)

  // Prepare events for timeline
  const events = (shipment.trackingEvents || []).map((event) => ({
    timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : String(event.timestamp),
    status: event.status as ShipmentStatus,
    description: event.description,
    location: event.location,
  }))

  // If no events but has status, create initial event
  if (events.length === 0 && shipment.status !== 'pending') {
    events.push({
      timestamp: shipment.createdAt instanceof Date
        ? shipment.createdAt.toISOString()
        : String(shipment.createdAt),
      status: 'pending' as ShipmentStatus,
      description: 'Order placed',
      location: undefined,
    })

    if (shipment.status === 'booked' || shipment.status === 'label_created') {
      events.push({
        timestamp: shipment.updatedAt instanceof Date
          ? shipment.updatedAt.toISOString()
          : String(shipment.updatedAt),
        status: 'booked' as ShipmentStatus,
        description: 'Shipping label created',
        location: undefined,
      })
    }
  }

  // Format estimated delivery
  const estimatedDelivery = shipment.estimatedDeliveryDate || shipment.estimatedDelivery
    ? (shipment.estimatedDeliveryDate || shipment.estimatedDelivery)!.toISOString()
    : undefined

  const estimatedDeliveryRange = shipment.estimatedDeliveryRange
    ? [
        shipment.estimatedDeliveryRange[0].toISOString(),
        shipment.estimatedDeliveryRange[1].toISOString(),
      ] as [string, string]
    : undefined

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Package className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Package</h1>
          <p className="mt-2 text-gray-600">
            Tracking Number: <span className="font-mono font-medium">{trackingNumber}</span>
          </p>
        </div>

        {/* Status */}
        <div className="mb-6">
          <TrackingStatus
            status={shipment.status as ShipmentStatus}
            estimatedDelivery={estimatedDelivery}
            estimatedDeliveryRange={estimatedDeliveryRange}
          />
        </div>

        {/* Order Info Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                <Store className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {tenant.businessName || 'Seller'}
                </p>
                <p className="text-sm text-gray-500">
                  Order ending in ...{orderNumberLast4}
                </p>
              </div>
            </div>

            {tenant.slug && (
              <Link
                href={`/${tenant.slug}`}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                View Shop
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>

          {/* Carrier Info */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span>Shipped via </span>
                <span className="font-medium text-gray-900">{carrierName}</span>
              </div>

              {shipment.trackingUrl && (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                >
                  Track on {carrierName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <TrackingTimeline
            events={events}
            currentStatus={shipment.status as ShipmentStatus}
          />
        </div>

        {/* Help Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <HelpCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Need Help?</h3>
              <p className="mt-1 text-sm text-gray-600">
                If you have questions about your order, please contact the seller.
              </p>
              {tenant.slug && (
                <Link
                  href={`/${tenant.slug}/contact`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Contact {tenant.businessName || 'Seller'}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Track Another Package */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Track another package?</p>
          <TrackingLookup compact />
        </div>
      </div>
    </div>
  )
}
