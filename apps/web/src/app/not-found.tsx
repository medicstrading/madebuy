import { Home, Search, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

// Explicitly prevent static prerendering of the not-found page
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBF7] to-amber-50/30 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              MadeBuy
            </span>
          </Link>
        </div>

        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent select-none">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It
            may have been moved or doesn&apos;t exist.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-full font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-semibold border-2 border-gray-200 hover:border-amber-300 hover:text-amber-700 transition-all"
          >
            <Search className="w-5 h-5" />
            Search Products
          </Link>
        </div>

        {/* Popular Sellers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
            <ShoppingBag className="w-5 h-5" />
            <p className="font-medium">Or explore our marketplace</p>
          </div>
          <p className="text-sm text-gray-500">
            Discover unique handmade products from talented makers
          </p>
        </div>
      </div>
    </div>
  )
}
