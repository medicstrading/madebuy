import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About - MadeBuy Marketplace',
  description: 'Learn about MadeBuy, the Australian marketplace for handmade goods with zero transaction fees',
}

export default function AboutPage() {
  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About MadeBuy</h1>
        
        <div className="prose prose-lg text-gray-600">
          <p className="text-xl leading-relaxed mb-8">
            MadeBuy is Australia&apos;s marketplace for handmade and unique products, 
            built by makers, for makers. We believe talented creators deserve a platform 
            that puts them first.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Zero Transaction Fees</h2>
          <p>
            Unlike other marketplaces that take 5-15% of every sale, MadeBuy charges 
            zero transaction fees. You keep 100% of your sales (minus standard payment 
            processing). We make money through optional subscription plans, not by 
            taking a cut of your hard work.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Australian Made</h2>
          <p>
            We&apos;re proudly Australian. Our platform is designed specifically for 
            Australian makers, with local payment processing, carbon-neutral shipping 
            through Sendle, and support in your timezone.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Your Shop, Your Brand</h2>
          <p>
            Every seller gets their own customizable storefront. Add your logo, choose 
            your colors, and create a shopping experience that reflects your brand. 
            Plus, list your products in our unified marketplace for maximum exposure.
          </p>

          <div className="mt-12 flex gap-4">
            <Link
              href="/auth/signup"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Selling
            </Link>
            <Link
              href="/pricing"
              className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
