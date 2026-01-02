import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Store, ShoppingBag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign In - MadeBuy',
  description: 'Sign in to your MadeBuy account',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-mb-cream to-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Marketplace
            </Link>
            <Link href="/marketplace" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mb-blue">
                <span className="text-lg font-bold text-white">M</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">MadeBuy</span>
            </Link>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MadeBuy</h1>
            <p className="text-gray-600">Choose how you&apos;d like to continue</p>
          </div>

          <div className="space-y-4">
            {/* Seller Sign In */}
            <a
              href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://madebuy-admin.nuc'}/login`}
              className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-mb-blue hover:shadow-lg transition-all group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-mb-blue/10 group-hover:bg-mb-blue/20 transition-colors">
                <Store className="h-7 w-7 text-mb-blue" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Seller Dashboard</h2>
                <p className="text-sm text-gray-500">Manage your shop, products & orders</p>
              </div>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Buyer - Coming Soon */}
            <div className="flex items-center gap-4 rounded-2xl border-2 border-gray-100 bg-gray-50 p-6 opacity-75">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-200">
                <ShoppingBag className="h-7 w-7 text-gray-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-500">Buyer Account</h2>
                <p className="text-sm text-gray-400">Track orders & save favorites</p>
              </div>
              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                Coming Soon
              </span>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Want to sell on MadeBuy?{' '}
            <Link href="/auth/signup" className="font-medium text-mb-blue hover:text-mb-blue-dark">
              Create a seller account
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} MadeBuy. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
