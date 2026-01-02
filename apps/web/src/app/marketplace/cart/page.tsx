import { Metadata } from 'next'
import { MarketplaceCartContent } from './MarketplaceCartContent'

export const metadata: Metadata = {
  title: 'Shopping Cart - MadeBuy Marketplace',
  description: 'Review your cart and checkout',
}

export default function MarketplaceCartPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <MarketplaceCartContent />
      </main>
    </div>
  )
}
