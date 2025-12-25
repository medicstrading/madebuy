import { requireTenant } from '@/lib/tenant'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Checkout Cancelled - ${tenant.businessName}`,
  }
}

export default async function CheckoutCancelPage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Checkout Cancelled
            </h1>

            <p className="mt-4 text-lg text-gray-600">
              Your checkout was cancelled. No charges were made.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href={`/${params.tenant}/cart`}
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
              >
                Return to Cart
              </Link>

              <Link
                href={`/${params.tenant}`}
                className="inline-block rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50"
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
