import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { PurchaseTracker } from '@/components/analytics/PurchaseTracker'
import { requireTenant } from '@/lib/tenant'
import { CartClearer } from '@/components/checkout/CartClearer'

export async function generateMetadata({
  params,
}: {
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Order Confirmed - ${tenant.businessName}`,
  }
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: { tenant: string }
  searchParams: { session_id?: string }
}) {
  const tenant = await requireTenant(params.tenant)
  const sessionId = searchParams.session_id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Analytics Tracking */}
      <PurchaseTracker tenantId={tenant.id} orderId={sessionId} />

      {/* PAY-02: Clear cart after successful checkout */}
      <CartClearer />

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Order Confirmed!
            </h1>

            <p className="mt-4 text-lg text-gray-600">
              Thank you for your purchase. We&apos;ve received your order and
              will send you a confirmation email shortly.
            </p>

            {sessionId && (
              <div className="mt-6 rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  Order Reference:{' '}
                  <span className="font-mono font-medium">{sessionId}</span>
                </p>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <p className="text-gray-600">
                You&apos;ll receive an email with your order details and
                tracking information once your order ships.
              </p>

              <Link
                href={`/${params.tenant}`}
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
