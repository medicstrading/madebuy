import { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pricing - MadeBuy',
  description: 'Zero transaction fees. Choose the plan that fits your business.',
}

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Get started with the basics',
    features: ['Up to 10 products', 'Basic storefront', 'Standard support'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Maker',
    price: 19,
    period: '/month',
    description: 'For growing makers',
    features: [
      'Unlimited products',
      'Marketplace listing',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: 39,
    period: '/month',
    description: 'For established sellers',
    features: [
      'Everything in Maker',
      'Custom domain',
      'Advanced analytics',
      'Social publishing',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Business',
    price: 79,
    period: '/month',
    description: 'For teams and high-volume sellers',
    features: [
      'Everything in Pro',
      'Multiple users',
      'API access',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/marketplace" className="text-2xl font-bold text-gray-900">
            MadeBuy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Zero transaction fees. Keep 100% of your sales.
          </p>
          <p className="text-gray-500">
            Unlike other marketplaces, we never take a cut of your earnings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-blue-600 text-white ring-4 ring-blue-600 ring-offset-2'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <p className={`mt-2 text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              <div className="mt-4">
                <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  ${plan.price}
                </span>
                <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-500'}>
                  {plan.period}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <svg className={`h-5 w-5 ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-sm ${plan.highlighted ? 'text-white' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className={`mt-8 block w-full rounded-lg py-3 px-4 text-center text-sm font-semibold ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include: Secure payments via Stripe | Australian-based support | Carbon-neutral shipping with Sendle
          </p>
        </div>
      </main>
    </div>
  )
}
