'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Heart, Menu } from 'lucide-react'
import { SearchAutocomplete, MegaMenu, MegaMenuMobile } from '@/components/marketplace'

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-outfit">
      {/* Modern Navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-mb-slate hover:bg-mb-cream transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link href="/marketplace" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mb-blue">
                <span className="text-lg font-bold text-white">M</span>
              </div>
              <span className="text-xl font-semibold text-mb-slate hidden sm:block">MadeBuy</span>
            </Link>

            {/* Search - Desktop */}
            <div className="hidden md:block flex-1 max-w-xl">
              <SearchAutocomplete placeholder="Search handmade treasures..." />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-full text-mb-slate hover:bg-mb-cream transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              <Link
                href="/marketplace/cart"
                className="flex h-10 w-10 items-center justify-center rounded-full text-mb-slate hover:bg-mb-cream transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/signin"
                className="ml-2 flex items-center gap-2 rounded-full bg-mb-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-mb-blue-dark transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Mobile Search - Below nav */}
          <div className="md:hidden pb-3">
            <SearchAutocomplete placeholder="Search products..." />
          </div>

          {/* Mega Menu - Desktop */}
          <div className="hidden lg:block pb-2">
            <MegaMenu />
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <MegaMenuMobile isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main content */}
      <main>{children}</main>

      {/* Modern Footer */}
      <footer className="mt-20 border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/marketplace" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900">
                  <span className="text-lg font-bold text-white">M</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">MadeBuy</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed">
                The marketplace for makers. List unlimited products with zero transaction fees.
              </p>
            </div>

            {/* Shop */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Shop</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/marketplace/browse" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Browse Products
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/categories" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Categories
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/sellers" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Top Sellers
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/new" className="text-gray-500 hover:text-gray-900 transition-colors">
                    New Arrivals
                  </Link>
                </li>
              </ul>
            </div>

            {/* Sell */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Sell</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/auth/signup" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Start Selling
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace/about" className="text-gray-500 hover:text-gray-900 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/seller-stories" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Seller Stories
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Support</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/help" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} MadeBuy. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-500">Made in Australia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
