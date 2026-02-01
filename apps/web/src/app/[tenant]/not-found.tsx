import { ArrowLeft, Home, Search, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering for tenant-specific 404
export const dynamic = 'force-dynamic'

export default function TenantNotFound() {
  // Note: We can't access params or tenant context in not-found.tsx
  // This is a Next.js limitation - we'll show a generic tenant 404

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200 select-none">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist in this store.
            It may have been removed or the link might be incorrect.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <Home className="w-5 h-5" />
            Visit Storefront
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center justify-center gap-2 text-gray-900 mb-2">
              <ShoppingBag className="w-5 h-5" />
              <h3 className="font-semibold">Browse Products</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Explore all available items
            </p>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all products →
            </Link>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center justify-center gap-2 text-gray-900 mb-2">
              <Search className="w-5 h-5" />
              <h3 className="font-semibold">Search</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Find what you&apos;re looking for
            </p>
            <Link
              href="/search"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Search products →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
