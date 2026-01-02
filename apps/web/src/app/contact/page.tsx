import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us - MadeBuy',
  description: 'Get in touch with the MadeBuy team',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/marketplace" className="text-2xl font-bold text-gray-900">
            MadeBuy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          We&apos;d love to hear from you
        </p>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>General Inquiry</option>
                <option>Seller Support</option>
                <option>Buyer Support</option>
                <option>Technical Issue</option>
                <option>Partnership</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>You can also reach us at:</p>
          <p className="font-semibold text-gray-900 mt-2">support@madebuy.com.au</p>
        </div>
      </main>
    </div>
  )
}
