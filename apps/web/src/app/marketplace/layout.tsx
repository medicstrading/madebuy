import Link from 'next/link'
import { ShoppingBag, User, Heart } from 'lucide-react'
import { SearchBar } from '@/components/marketplace'

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Marketplace Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b py-4">
            <Link href="/marketplace" className="flex items-center gap-2">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">MadeBuy</h1>
                <p className="text-xs text-gray-600">Marketplace for Makers</p>
              </div>
            </Link>

            {/* Search bar */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <SearchBar variant="header" placeholder="Search handmade products..." />
            </div>

            {/* User actions */}
            <div className="flex items-center gap-4">
              <button className="rounded-lg p-2 hover:bg-gray-100">
                <Heart className="h-6 w-6 text-gray-600" />
              </button>
              <Link
                href="/marketplace/cart"
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <ShoppingBag className="h-6 w-6 text-gray-600" />
              </Link>
              <Link
                href="/auth/signin"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <User className="h-5 w-5" />
                Sign In
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar - Always visible below main header on mobile */}
          <div className="lg:hidden py-3 border-t">
            <SearchBar variant="header" placeholder="Search products..." />
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-6 py-3 text-sm border-t">
            <Link href="/marketplace" className="font-medium text-gray-900 hover:text-blue-600">
              Home
            </Link>
            <Link href="/marketplace/browse" className="text-gray-600 hover:text-blue-600">
              Browse All
            </Link>
            <Link href="/marketplace/categories" className="text-gray-600 hover:text-blue-600">
              Categories
            </Link>
            <Link href="/marketplace/sellers" className="text-gray-600 hover:text-blue-600">
              Top Sellers
            </Link>
            <Link href="/marketplace/about" className="text-gray-600 hover:text-blue-600">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* About */}
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">About MadeBuy</h3>
              <p className="text-sm text-gray-600">
                A fair marketplace for makers and creators. List unlimited products with no transaction fees.
              </p>
            </div>

            {/* Shop */}
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Shop</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/marketplace/browse" className="hover:text-blue-600">
                    Browse All Products
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/categories" className="hover:text-blue-600">
                    Categories
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/sellers" className="hover:text-blue-600">
                    Top Sellers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Sell */}
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Sell on MadeBuy</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/auth/signup" className="hover:text-blue-600">
                    Start Selling
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-blue-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/about" className="hover:text-blue-600">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/help" className="hover:text-blue-600">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-blue-600">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-600">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-6 text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} MadeBuy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
