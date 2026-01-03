import { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Policy - MadeBuy',
  description: 'MadeBuy privacy policy and data handling practices',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/marketplace" className="text-2xl font-bold text-gray-900">
            MadeBuy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly:</p>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Seller profile information (business name, address)</li>
            <li>Order information (shipping address, purchase history)</li>
            <li>Communications with our support team</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Process transactions and send order updates</li>
            <li>Provide customer support</li>
            <li>Improve our platform and services</li>
            <li>Send marketing communications (with your consent)</li>
            <li>Prevent fraud and ensure security</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We share your information with:</p>
          <ul>
            <li>Sellers (to fulfill your orders)</li>
            <li>Payment processors (Stripe)</li>
            <li>Shipping providers (to deliver orders)</li>
            <li>Service providers who help operate our platform</li>
          </ul>
          <p>We never sell your personal information to third parties.</p>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. 
            Payment information is processed securely through Stripe and never stored 
            on our servers.
          </p>

          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of marketing communications</li>
            <li>Export your data</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            We use cookies to maintain your session, remember preferences, and 
            analyze platform usage. You can control cookies through your browser settings.
          </p>

          <h2>7. Australian Privacy Act</h2>
          <p>
            We comply with the Australian Privacy Principles under the Privacy Act 1988. 
            For complaints, contact the Office of the Australian Information Commissioner.
          </p>

          <h2>8. Contact</h2>
          <p>
            For privacy inquiries, contact us at{' '}
            <a href="mailto:privacy@madebuy.com.au">privacy@madebuy.com.au</a>
          </p>
        </div>
      </main>
    </div>
  )
}
