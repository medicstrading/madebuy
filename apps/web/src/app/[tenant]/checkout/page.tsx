import { requireTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Checkout - ${tenant.businessName}`,
  }
}

export default async function CheckoutPage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/${params.tenant}/cart`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Cart
          </Link>
        </div>
      </header>

      {/* Checkout Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <CheckoutForm tenant={params.tenant} tenantId={tenant.id} />
      </main>
    </div>
  )
}
