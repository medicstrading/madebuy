'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-[#FFFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Start free. Upgrade when you&apos;re ready. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-full p-1.5 shadow-sm border border-gray-100">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                !isYearly
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                isYearly
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Yearly{' '}
              <span
                className={`text-sm ml-1 ${isYearly ? 'text-amber-100' : 'text-emerald-600'}`}
              >
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              name: 'Starter',
              price: { monthly: 0, yearly: 0 },
              description: 'Try it out',
              features: [
                '5 products',
                '3 images per product',
                '50 MB storage',
                '10 orders/month',
              ],
              cta: 'Start Free',
              popular: false,
            },
            {
              name: 'Maker',
              price: { monthly: 15, yearly: 150 },
              description: 'For growing makers',
              features: [
                '50 products',
                '8 images per product',
                '500 MB storage',
                'Custom domain',
                '1 social platform',
                '20 AI captions/month',
              ],
              cta: 'Get Started',
              popular: true,
            },
            {
              name: 'Professional',
              price: { monthly: 29, yearly: 290 },
              description: 'Full-time makers',
              features: [
                '200 products',
                '15 images per product',
                '2 GB storage',
                '3 social platforms',
                '100 AI captions/month',
                'Priority support',
              ],
              cta: 'Get Started',
              popular: false,
            },
            {
              name: 'Studio',
              price: { monthly: 59, yearly: 590 },
              description: 'Established brands',
              features: [
                'Unlimited products',
                '30 images per product',
                '10 GB storage',
                'Unlimited social platforms',
                'Unlimited AI captions',
                '3 team members',
              ],
              cta: 'Get Started',
              popular: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-6 lg:p-8 transition-all ${
                plan.popular
                  ? 'border-2 border-amber-400 shadow-xl shadow-amber-100/50 scale-105 lg:scale-110 z-10'
                  : 'border-2 border-gray-100 hover:border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    $
                    {isYearly
                      ? Math.round(plan.price.yearly / 12)
                      : plan.price.monthly}
                  </span>
                  <span className="text-gray-500">/mo</span>
                </div>
                {isYearly && plan.price.yearly > 0 && (
                  <p className="text-sm text-emerald-600 mt-1">
                    ${plan.price.yearly}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm"
                  >
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
