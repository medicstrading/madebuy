import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Help Center - MadeBuy',
  description: 'Get help with buying or selling on MadeBuy',
}

const faqs = [
  {
    question: 'How do I create a seller account?',
    answer: 'Click "Start Selling" and follow the signup process. You can start listing products immediately on our Free plan.',
  },
  {
    question: 'What are the fees?',
    answer: 'MadeBuy charges zero transaction fees. You only pay standard Stripe payment processing (1.7% + $0.30 for domestic cards). Optional subscription plans unlock additional features.',
  },
  {
    question: 'How do I track my order?',
    answer: 'You\'ll receive a tracking number via email once your order ships. You can also track orders from your order confirmation page.',
  },
  {
    question: 'How do returns work?',
    answer: 'Return policies are set by individual sellers. Check the product page or contact the seller directly for their return policy.',
  },
  {
    question: 'How do I contact a seller?',
    answer: 'Visit the seller\'s shop page and use the contact form, or check the product listing for contact options.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Yes! All payments are processed securely through Stripe. We never store your card details.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/marketplace" className="text-2xl font-bold text-gray-900">
            MadeBuy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Help Center
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Find answers to common questions
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden group"
            >
              <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 list-none flex justify-between items-center">
                {faq.question}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Still need help?
          </h2>
          <p className="text-gray-600 mb-6">
            Our support team is here to assist you
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  )
}
