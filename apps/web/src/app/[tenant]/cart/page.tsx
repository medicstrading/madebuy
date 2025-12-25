import { requireTenant } from '@/lib/tenant'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CartContent } from '@/components/cart/CartContent'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Shopping Cart - ${tenant.businessName}`,
  }
}

export default async function CartPage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/${params.tenant}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>
      </header>

      {/* Cart Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <CartContent tenant={params.tenant} tenantId={tenant.id} />
      </main>
    </div>
  )
}
