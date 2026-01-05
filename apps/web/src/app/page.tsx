'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Package,
  Share2,
  Store,
  CreditCard,
  BarChart3,
  Smartphone,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
  Users,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react'

export default function LandingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-white font-outfit">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-mb-blue to-mb-blue-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">MadeBuy</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-mb-blue transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-mb-blue transition-colors">Pricing</a>
              <Link href="/help" className="text-gray-600 hover:text-mb-blue transition-colors">Help</Link>
              <Link href="/auth/signin" className="text-gray-600 hover:text-mb-blue transition-colors">Sign In</Link>
              <Link
                href="/auth/signup"
                className="bg-mb-blue text-white px-5 py-2.5 rounded-full font-medium hover:bg-mb-blue-dark transition-all hover:shadow-lg hover:shadow-mb-blue/25"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-mb-sky/50 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50/50 via-transparent to-transparent rounded-full blur-3xl" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #1e3a5f 1px, transparent 1px), linear-gradient(to bottom, #1e3a5f 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
                <Sparkles className="w-4 h-4" />
                <span>Zero Transaction Fees</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Sell Your Handmade Creations.{' '}
                <span className="relative">
                  <span className="relative z-10 text-mb-blue">Keep Every Dollar.</span>
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-mb-sky" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Unlike Etsy&apos;s 15%+ fees, you keep <span className="font-semibold text-mb-accent">100% of your sales</span>.
                Your own storefront, inventory tools, and social publishing—all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/signup"
                  className="group inline-flex items-center justify-center gap-2 bg-mb-blue text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-mb-blue-dark transition-all hover:shadow-xl hover:shadow-mb-blue/25 hover:-translate-y-0.5"
                >
                  Start Free Today
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border-2 border-gray-200 hover:border-mb-blue hover:text-mb-blue transition-all"
                >
                  See Pricing
                </a>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300"
                      style={{ backgroundColor: `hsl(${i * 60}, 70%, 85%)` }}
                    />
                  ))}
                </div>
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">500+</span> makers already selling
                </p>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative lg:h-[600px]">
              <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl border border-gray-200 shadow-2xl shadow-gray-200/50 p-6 lg:p-8">
                {/* Mock dashboard preview */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Header bar */}
                  <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-gray-200 h-6 rounded-lg max-w-[200px]" />
                  </div>

                  {/* Dashboard content mock */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-32 bg-gray-100 rounded-lg" />
                      <div className="h-8 w-24 bg-mb-blue/10 rounded-lg" />
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Revenue', value: '$2,847', color: 'bg-emerald-50 text-emerald-600' },
                        { label: 'Orders', value: '156', color: 'bg-mb-sky text-mb-blue' },
                        { label: 'Visitors', value: '3.2k', color: 'bg-amber-50 text-amber-600' },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                          <p className={`text-xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Product list mock */}
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg" />
                          <div className="flex-1">
                            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-20 bg-gray-100 rounded" />
                          </div>
                          <div className="h-6 w-16 bg-emerald-100 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-4 border border-gray-100 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">New Sale!</p>
                      <p className="text-sm text-gray-500">$89.00 earned</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-mb-blue to-mb-blue-dark text-white rounded-2xl shadow-lg p-4 animate-float-delayed">
                  <p className="text-3xl font-bold">0%</p>
                  <p className="text-sm opacity-90">Transaction Fee</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Comparison Section */}
      <section className="py-20 lg:py-28 bg-mb-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Tired of Losing{' '}
              <span className="text-red-400">15%+</span>{' '}
              to Marketplace Fees?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See how much you&apos;re really paying on other platforms
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* MadeBuy */}
            <div className="relative bg-gradient-to-b from-emerald-500/20 to-transparent rounded-3xl p-8 border-2 border-emerald-400/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Best Value
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">M</span>
                </div>
                <h3 className="text-xl font-bold mb-4">MadeBuy</h3>
                <div className="mb-6">
                  <span className="text-6xl font-bold text-emerald-400">0%</span>
                  <p className="text-gray-300 mt-2">Transaction Fee</p>
                </div>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-gray-300">Keep 100% of sales</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-gray-300">Only Stripe processing (~2.9%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-gray-300">No hidden fees</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-300">On a $100 sale, you keep</p>
                  <p className="text-2xl font-bold text-emerald-400">$97.10</p>
                </div>
              </div>
            </div>

            {/* Etsy */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛍️</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Etsy</h3>
                <div className="mb-6">
                  <span className="text-6xl font-bold text-red-400">15%+</span>
                  <p className="text-gray-300 mt-2">Total Fees</p>
                </div>
                <div className="space-y-3 text-left text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Transaction fee</span>
                    <span className="text-red-400">6.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Payment processing</span>
                    <span className="text-red-400">3% + $0.25</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Offsite ads (mandatory)</span>
                    <span className="text-red-400">12-15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Listing fee</span>
                    <span className="text-red-400">$0.20/item</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-red-500/10 rounded-xl">
                  <p className="text-sm text-gray-400">On a $100 sale, you keep</p>
                  <p className="text-2xl font-bold text-red-400">~$85</p>
                </div>
              </div>
            </div>

            {/* Shopify */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Shopify</h3>
                <div className="mb-6">
                  <span className="text-6xl font-bold text-yellow-400">2%+</span>
                  <p className="text-gray-300 mt-2">+ Monthly Fee</p>
                </div>
                <div className="space-y-3 text-left text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Basic plan</span>
                    <span className="text-yellow-400">$39/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Transaction fee</span>
                    <span className="text-yellow-400">2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Credit card rate</span>
                    <span className="text-yellow-400">2.9% + $0.30</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Apps & themes</span>
                    <span className="text-yellow-400">Extra $$</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-500/10 rounded-xl">
                  <p className="text-sm text-gray-400">On a $100 sale, you keep</p>
                  <p className="text-2xl font-bold text-yellow-400">~$95</p>
                  <p className="text-xs text-gray-500">(minus $39/mo)</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-400 mt-12 text-lg">
            On $10,000 in annual sales, you save <span className="text-emerald-400 font-bold">$1,200+</span> with MadeBuy
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to{' '}
              <span className="text-mb-blue">Grow Your Business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From inventory to social media, all your maker tools in one place
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: Package,
                title: 'Inventory Management',
                description: 'Track products, variants, and stock levels. Never oversell again.',
                color: 'bg-blue-50 text-mb-blue',
              },
              {
                icon: Share2,
                title: 'Social Publishing',
                description: 'Schedule posts with AI-generated captions. Grow your audience effortlessly.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: Store,
                title: 'Custom Storefront',
                description: 'Your own branded online store. Custom domain, your style.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: CreditCard,
                title: 'Stripe Payments',
                description: 'Secure checkout with money deposited directly to your account.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: BarChart3,
                title: 'Analytics Dashboard',
                description: 'Track sales, traffic, and conversions. Data-driven decisions.',
                color: 'bg-rose-50 text-rose-600',
              },
              {
                icon: Smartphone,
                title: 'Mobile Optimized',
                description: 'Beautiful on every device. Your customers can shop anywhere.',
                color: 'bg-cyan-50 text-cyan-600',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-mb-blue/20 hover:shadow-xl hover:shadow-mb-blue/5 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Start free, upgrade when you&apos;re ready. No transaction fees, ever.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 bg-gray-100 rounded-full p-1.5">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  !isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Yearly <span className="text-emerald-600 text-sm ml-1">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Starter',
                price: { monthly: 0, yearly: 0 },
                description: 'Try before you buy',
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
                description: 'For serious hobbyists',
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
                description: 'For full-time makers',
                features: [
                  '200 products',
                  '15 images per product',
                  '2 GB storage',
                  '3 social platforms',
                  '100 AI captions/month',
                  'Advanced analytics',
                  'Priority support',
                ],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Studio',
                price: { monthly: 59, yearly: 590 },
                description: 'For established brands',
                features: [
                  'Unlimited products',
                  '30 images per product',
                  '10 GB storage',
                  'Unlimited platforms',
                  'Unlimited AI captions',
                  'API access',
                  '3 team members',
                ],
                cta: 'Get Started',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-6 lg:p-8 border-2 transition-all ${
                  plan.popular
                    ? 'border-mb-blue shadow-xl shadow-mb-blue/10 scale-105 lg:scale-110 z-10'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-mb-blue text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${isYearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
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
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'bg-mb-blue text-white hover:bg-mb-blue-dark'
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

      {/* Trust Section */}
      <section className="py-20 bg-mb-sky/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: MapPin,
                title: 'Australian-Based Support',
                description: 'Real humans, local time zone. We&apos;re here when you need us.',
              },
              {
                icon: Shield,
                title: 'Secure Payments via Stripe',
                description: 'Bank-level security. Your money goes directly to your account.',
              },
              {
                icon: Users,
                title: 'Join 500+ Makers',
                description: 'A growing community of artisans and creators just like you.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-mb-blue" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Ready to Keep{' '}
            <span className="text-mb-accent">100%</span>{' '}
            of Your Sales?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join hundreds of makers who&apos;ve switched to MadeBuy. Start free, no credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex items-center justify-center gap-3 bg-mb-blue text-white px-10 py-5 rounded-full font-semibold text-xl hover:bg-mb-blue-dark transition-all hover:shadow-2xl hover:shadow-mb-blue/25 hover:-translate-y-1"
          >
            Start Free Today
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-mb-blue to-mb-blue-dark rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="text-xl font-bold text-white">MadeBuy</span>
              </Link>
              <p className="text-sm leading-relaxed">
                The marketplace for makers. Zero transaction fees, beautiful storefronts, powerful tools.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/seller-stories" className="hover:text-white transition-colors">Seller Stories</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} MadeBuy. Made with love in Australia.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
      `}</style>
    </div>
  )
}
