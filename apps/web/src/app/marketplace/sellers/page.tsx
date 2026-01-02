import { Metadata } from 'next'
import Link from 'next/link'
import { marketplace } from '@madebuy/db'

export const metadata: Metadata = {
  title: 'Sellers - MadeBuy Marketplace',
  description: 'Discover talented Australian makers and artisans',
}

export const revalidate = 300 // Revalidate every 5 minutes

export default async function SellersPage() {
  const sellers = await marketplace.getTopSellers(50)

  return (
    <div className="py-8">
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/marketplace" className="hover:text-gray-900">Marketplace</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Sellers</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">Our Sellers</h1>
        <p className="mt-2 text-gray-600">
          Discover talented makers and artisans from across Australia
        </p>
      </div>

      {sellers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No sellers yet. Be the first!</p>
          <Link href="/auth/signup" className="mt-4 inline-block text-blue-600 hover:underline">
            Start selling on MadeBuy
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sellers.map((seller) => (
            <Link
              key={seller.tenantId}
              href={`/marketplace/seller/${seller.tenantId}`}
              className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                {seller.logoUrl ? (
                  <img
                    src={seller.logoUrl}
                    alt={seller.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-blue-600">
                    {seller.businessName?.charAt(0) || 'M'}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {seller.businessName}
                </h3>
                {seller.bio && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{seller.bio}</p>
                )}
                {seller.totalSales > 0 && (
                  <p className="mt-1 text-xs text-gray-400">{seller.totalSales} sales</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
