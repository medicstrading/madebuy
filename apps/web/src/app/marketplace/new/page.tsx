import { Metadata } from 'next'
import Link from 'next/link'
import { marketplace } from '@madebuy/db'

export const metadata: Metadata = {
  title: 'New Arrivals - MadeBuy Marketplace',
  description: 'Discover the latest handmade products from Australian makers',
}

export const revalidate = 300 // Revalidate every 5 minutes

export default async function NewArrivalsPage() {
  const { products } = await marketplace.listMarketplaceProducts({
    limit: 24,
    sortBy: 'newest',
  })

  return (
    <div className="py-8">
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/marketplace" className="hover:text-gray-900">Marketplace</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">New Arrivals</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">New Arrivals</h1>
        <p className="mt-2 text-gray-600">
          Fresh finds from talented Australian makers
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No products yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/marketplace/product/${product.id}`}
              className="group block bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-100">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  ${product.price?.toFixed(2)}
                </p>
                {product.sellerName && (
                  <p className="mt-1 text-sm text-gray-500">{product.sellerName}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
