import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Seller Stories - MadeBuy',
  description: 'Hear from makers who have built their business on MadeBuy',
}

export default function SellerStoriesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/marketplace"
            className="text-2xl font-bold text-gray-900"
          >
            MadeBuy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Seller Stories
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Real makers sharing their journey on MadeBuy
        </p>

        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-6xl mb-6">🎨</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            We&apos;re gathering inspiring stories from our sellers. Want to
            share your journey? Get in touch!
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Share Your Story
            </Link>
            <Link
              href="/marketplace"
              className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
