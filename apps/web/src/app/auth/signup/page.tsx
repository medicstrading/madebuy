import { ArrowLeft, Check, Sparkles, Store, Zap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Start Selling - MadeBuy',
  description:
    'Create your MadeBuy seller account and start selling handmade products',
}

const benefits = [
  { icon: Zap, text: 'Zero transaction fees' },
  { icon: Store, text: 'Your own storefront' },
  { icon: Sparkles, text: 'Marketplace exposure' },
]

export default function SignUpPage() {
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
              <span className="text-xl font-semibold text-gray-900">
                MadeBuy
              </span>
            </Link>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-mb-blue/10 px-4 py-2 text-sm font-medium text-mb-blue mb-4">
              <Sparkles className="h-4 w-4" />
              Start Selling Today
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join Australia&apos;s Marketplace for Makers
            </h1>
            <p className="text-gray-600">
              Start free with zero transaction fees on every plan
            </p>
          </div>

          {/* Benefits */}
          <div className="flex justify-center gap-6 mb-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.text}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </div>
                {benefit.text}
              </div>
            ))}
          </div>

          {/* CTA Card */}
          <div className="rounded-2xl border-2 border-mb-blue bg-white p-8 shadow-lg">
            <div className="text-center mb-6">
              <Store className="h-12 w-12 text-mb-blue mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Create Your Seller Account
              </h2>
              <p className="text-gray-500">
                Set up your shop in minutes and start reaching customers across
                Australia
              </p>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://madebuy-admin.nuc'}/register`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-mb-blue px-6 py-4 text-base font-semibold text-white hover:bg-mb-blue-dark transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </a>

            <p className="mt-4 text-center text-xs text-gray-400">
              No credit card required. Free plan available.
            </p>
          </div>

          {/* Pricing Link */}
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              className="text-sm text-gray-500 hover:text-mb-blue transition-colors"
            >
              View pricing plans →
            </Link>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-mb-blue hover:text-mb-blue-dark"
            >
              Sign in
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
