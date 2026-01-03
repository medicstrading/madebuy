import { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service - MadeBuy',
  description: 'MadeBuy terms of service and user agreement',
}

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using MadeBuy, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our platform.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            MadeBuy is an online marketplace that connects buyers with independent sellers 
            of handmade and unique products. We provide the platform; individual sellers 
            are responsible for their products and fulfillment.
          </p>

          <h2>3. Seller Responsibilities</h2>
          <p>Sellers agree to:</p>
          <ul>
            <li>Accurately describe their products</li>
            <li>Ship orders within stated timeframes</li>
            <li>Handle customer service for their products</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not sell prohibited items</li>
          </ul>

          <h2>4. Buyer Responsibilities</h2>
          <p>Buyers agree to:</p>
          <ul>
            <li>Provide accurate shipping information</li>
            <li>Pay for purchases in a timely manner</li>
            <li>Contact sellers directly for order issues</li>
          </ul>

          <h2>5. Payments</h2>
          <p>
            All payments are processed securely through Stripe. MadeBuy does not store 
            payment card information. Sellers receive payments according to their Stripe 
            Connect payout schedule.
          </p>

          <h2>6. Fees</h2>
          <p>
            MadeBuy charges zero transaction fees to sellers. Sellers may optionally 
            subscribe to paid plans for additional features. Standard payment processing 
            fees apply.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            Sellers retain ownership of their product listings and images. By listing 
            on MadeBuy, sellers grant us a license to display their content on our platform.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            MadeBuy is a platform connecting buyers and sellers. We are not responsible 
            for the quality, safety, or legality of items sold, or the accuracy of listings.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@madebuy.com.au">legal@madebuy.com.au</a>
          </p>
        </div>
      </main>
    </div>
  )
}
