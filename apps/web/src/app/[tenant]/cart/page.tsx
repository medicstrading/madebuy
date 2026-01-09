import { requireTenant } from '@/lib/tenant'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
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
    <div className="min-h-screen bg-white tenant-theme">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/${params.tenant}`}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <div className="flex items-center gap-2 text-gray-900">
              <ShoppingBag className="h-5 w-5" />
              <span className="font-medium">Cart</span>
            </div>
            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Cart Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <CartContent
          tenant={params.tenant}
          tenantId={tenant.id}
          freeShippingThreshold={tenant.freeShippingThreshold}
        />
      </main>
    </div>
  )
}
