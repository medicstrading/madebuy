import {
  BookOpen,
  CreditCard,
  HelpCircle,
  Image as ImageIcon,
  Mail,
  Package,
  Settings,
  Share2,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react'
import Link from 'next/link'

interface HelpSection {
  title: string
  description: string
  icon: React.ElementType
  articles: {
    title: string
    href: string
  }[]
}

const helpSections: HelpSection[] = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of setting up your store',
    icon: Store,
    articles: [
      { title: 'Creating your first product', href: '#first-product' },
      { title: 'Setting up your business profile', href: '#business-profile' },
      { title: 'Customizing your storefront', href: '#customize-store' },
      { title: 'Understanding your dashboard', href: '#dashboard' },
    ],
  },
  {
    title: 'Products & Inventory',
    description: 'Manage your products and stock levels',
    icon: Package,
    articles: [
      { title: 'Adding product images', href: '#product-images' },
      { title: 'Managing product variants', href: '#variants' },
      { title: 'Setting up product categories', href: '#categories' },
      { title: 'Tracking inventory and stock', href: '#inventory' },
    ],
  },
  {
    title: 'Payments & Shipping',
    description: 'Configure how you get paid and deliver products',
    icon: CreditCard,
    articles: [
      { title: 'Connecting your Stripe account', href: '#stripe' },
      { title: 'Setting up shipping methods', href: '#shipping' },
      { title: 'Understanding fees and payouts', href: '#fees' },
      { title: 'Configuring tax settings', href: '#tax' },
    ],
  },
  {
    title: 'Marketing & Sales',
    description: 'Promote your store and drive sales',
    icon: Share2,
    articles: [
      { title: 'Sharing your store on social media', href: '#social' },
      { title: 'Using AI-generated captions', href: '#ai-captions' },
      { title: 'Creating discount codes', href: '#discounts' },
      { title: 'Building your email list', href: '#email' },
    ],
  },
  {
    title: 'Orders & Customers',
    description: 'Process orders and communicate with buyers',
    icon: ShoppingBag,
    articles: [
      { title: 'Managing orders', href: '#orders' },
      { title: 'Handling customer enquiries', href: '#enquiries' },
      { title: 'Issuing refunds', href: '#refunds' },
      { title: 'Printing packing slips', href: '#packing-slips' },
    ],
  },
  {
    title: 'Store Design',
    description: 'Customize the look and feel of your store',
    icon: Settings,
    articles: [
      { title: 'Choosing a template', href: '#templates' },
      { title: 'Uploading your logo', href: '#logo' },
      { title: 'Customizing colors and fonts', href: '#branding' },
      { title: 'Adding custom pages', href: '#pages' },
    ],
  },
]

const faqs = [
  {
    question: 'How do I get paid?',
    answer:
      'MadeBuy uses Stripe Connect for payments. When you connect your Stripe account, customer payments go directly to your bank account. Payouts are typically received within 2-7 business days.',
  },
  {
    question: 'What fees does MadeBuy charge?',
    answer:
      'MadeBuy charges zero transaction fees - you keep 100% of your sales! You only pay standard Stripe processing fees (2.9% + 30¢ per transaction) and your monthly subscription based on your plan.',
  },
  {
    question: 'Can I use my own domain name?',
    answer:
      'Yes! Professional and Studio plans include custom domain support. You can connect your own domain name through the Website Design settings.',
  },
  {
    question: 'How do I add products?',
    answer:
      'Click the "Add New Product" button in your inventory, or use the quick action on your dashboard. Fill in product details, upload images, set your price, and publish!',
  },
  {
    question: 'What shipping options are available?',
    answer:
      'You can configure custom shipping methods with your own rates, or integrate with Sendle for automated shipping quotes. Set different rates for different countries and regions.',
  },
  {
    question: 'Can I sell digital products?',
    answer:
      'Yes! MadeBuy supports both physical and digital products. For digital products, files are automatically delivered to customers after purchase.',
  },
  {
    question: 'How does social publishing work?',
    answer:
      'Connect your social media accounts (Instagram, Facebook, TikTok, Pinterest) through the Publish tab. You can schedule posts and use AI to generate engaging captions for your products.',
  },
  {
    question: 'Can I import products from another platform?',
    answer:
      'Yes! MadeBuy supports importing products from Etsy, eBay, and other platforms. Use the import wizard in your inventory to get started.',
  },
]

export default function HelpPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4 shadow-lg shadow-blue-500/25">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Help Center</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Everything you need to know about running your MadeBuy store
        </p>
      </div>

      {/* Quick Start Guide */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quick Start Guide
            </h2>
            <p className="text-gray-600">
              New to MadeBuy? Follow these steps to get your store up and
              running
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <QuickStartCard
            number={1}
            title="Set up your profile"
            description="Add your business name, description, and logo to make a great first impression"
            href="/dashboard/settings"
          />
          <QuickStartCard
            number={2}
            title="Add your first product"
            description="Create a product listing with photos, description, and pricing"
            href="/dashboard/inventory/new"
          />
          <QuickStartCard
            number={3}
            title="Connect payments"
            description="Link your Stripe account so you can start accepting orders"
            href="/dashboard/connections"
          />
          <QuickStartCard
            number={4}
            title="Configure shipping"
            description="Set up how you'll deliver products to your customers"
            href="/dashboard/settings/shipping"
          />
          <QuickStartCard
            number={5}
            title="Customize your store"
            description="Choose colors, fonts, and layouts that match your brand"
            href="/dashboard/website-design"
          />
          <QuickStartCard
            number={6}
            title="Share your store"
            description="Get your unique store URL and start promoting to customers"
            href="/dashboard/settings"
          />
        </div>
      </section>

      {/* Help Topics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Browse Help Topics
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpSections.map((section) => {
            const Icon = section.icon
            return (
              <div
                key={section.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200">
                    <Icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="font-bold text-gray-900">{section.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {section.description}
                </p>
                <ul className="space-y-2">
                  {section.articles.map((article) => (
                    <li key={article.title}>
                      <a
                        href={article.href}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {article.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-gray-100 pb-6 last:border-0"
            >
              <h3 className="font-semibold text-gray-900 mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 text-center shadow-sm">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Still need help?
        </h2>
        <p className="text-gray-600 mb-6">
          Cannot find what you are looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@madebuy.com.au"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Mail className="h-4 w-4" />
          Contact Support
        </a>
      </section>
    </div>
  )
}

function QuickStartCard({
  number,
  title,
  description,
  href,
}: {
  number: number
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg border border-blue-100 bg-white p-4 hover:bg-blue-50 hover:border-blue-200 transition-all"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-900">
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  )
}
