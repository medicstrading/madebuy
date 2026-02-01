import { messages, orders, tenants } from '@madebuy/db'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrderViewClient } from './OrderViewClient'

interface OrderViewPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: OrderViewPageProps): Promise<Metadata> {
  const { token } = await params

  // Validate access token
  const accessToken = await messages.validateOrderAccessToken(token)
  if (!accessToken) {
    return { title: 'Order Not Found' }
  }

  // Get order
  const order = await orders.getOrder(accessToken.tenantId, accessToken.orderId)
  if (!order) {
    return { title: 'Order Not Found' }
  }

  // Get tenant
  const tenant = await tenants.getTenantById(accessToken.tenantId)

  return {
    title: `Order ${order.orderNumber}${tenant ? ` - ${tenant.businessName}` : ''}`,
    description: `View your order details and message ${tenant?.businessName || 'the seller'}`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderViewPage({ params }: OrderViewPageProps) {
  const { token } = await params

  // Validate token format
  if (!token || token.length < 20) {
    notFound()
  }

  // Validate access token
  const accessToken = await messages.validateOrderAccessToken(token)
  if (!accessToken) {
    notFound()
  }

  // Get order
  const order = await orders.getOrder(accessToken.tenantId, accessToken.orderId)
  if (!order) {
    notFound()
  }

  // Get tenant
  const tenant = await tenants.getTenantById(accessToken.tenantId)
  if (!tenant) {
    notFound()
  }

  // Get message thread
  const thread = await messages.getMessageThread(
    accessToken.tenantId,
    accessToken.orderId,
    'customer',
  )

  // Mark seller messages as read
  if (thread.unreadCount > 0) {
    await messages.markAllAsReadForOrder(
      accessToken.tenantId,
      accessToken.orderId,
      'seller',
    )
  }

  // Prepare data for client
  const orderData = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      imageUrl: item.imageUrl,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    carrier: order.carrier,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    shippedAt: order.shippedAt?.toISOString(),
    deliveredAt: order.deliveredAt?.toISOString(),
  }

  const sellerData = {
    name: tenant.businessName || 'Seller',
    email: tenant.email,
    slug: tenant.slug,
  }

  return (
    <OrderViewClient
      token={token}
      order={orderData}
      seller={sellerData}
      initialMessages={thread.messages}
    />
  )
}
