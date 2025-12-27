import { requireTenant } from '@/lib/session'
import { getMarketplaceAccessLevel } from '@/lib/marketplace'
import Link from 'next/link'
import { TrendingUp, Star, DollarSign, Eye, ShoppingBag, AlertCircle, ArrowUpRight } from 'lucide-react'

export const metadata = {
  title: 'Marketplace - MadeBuy Admin',
}

export default async function MarketplacePage() {
  const tenant = await requireTenant()
  const access = getMarketplaceAccessLevel(tenant)

  // TODO: Fetch marketplace stats from API
  // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketplace/stats`)
  // const stats = await response.json()

  // If tenant doesn't have marketplace access, show upgrade prompt
  if (!access.canList) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-600">
            List your products in the MadeBuy marketplace and reach thousands of buyers
          </p>
        </div>

        {/* Upgrade Prompt */}
        <div className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Unlock Marketplace Access</h2>
              <p className="text-gray-600">Current plan: {tenant.plan}</p>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
              <p className="text-gray-700">List unlimited products in the marketplace</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
              <p className="text-gray-700">Reach thousands of active buyers</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
              <p className="text-gray-700">No transaction fees, ever</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
              <p className="text-gray-700">Detailed marketplace analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Upgrade to Pro - $29/month
              <ArrowUpRight className="h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Compare Plans
            </Link>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold text-gray-900">Increased Visibility</h3>
            <p className="text-sm text-gray-600">
              Get discovered by customers browsing the marketplace, beyond your direct store traffic.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold text-gray-900">Grow Your Sales</h3>
            <p className="text-sm text-gray-600">
              Tap into a community of buyers specifically looking for handmade products like yours.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold text-gray-900">Build Reputation</h3>
            <p className="text-sm text-gray-600">
              Collect reviews and ratings to build trust and stand out from the competition.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Tenant has marketplace access - show dashboard
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your marketplace listings and track performance
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Manage Products
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Listed Products</span>
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="mt-1 text-xs text-gray-500">0 pending approval</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Marketplace Views</span>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="mt-1 text-xs text-green-600">Start listing to get views</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Marketplace Sales</span>
            <ShoppingBag className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="mt-1 text-xs text-gray-500">All-time</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Seller Rating</span>
            <Star className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-900">—</div>
          </div>
          <p className="mt-1 text-xs text-gray-500">No reviews yet</p>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="mb-4 flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <h3 className="mb-1 font-semibold text-gray-900">Get Started with Marketplace</h3>
            <p className="text-sm text-gray-700">
              You haven&apos;t listed any products yet. Follow these steps to start selling in the marketplace:
            </p>
          </div>
        </div>

        <ol className="ml-8 space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="font-semibold">1.</span>
            <span>
              Go to <Link href="/dashboard/inventory" className="text-blue-600 hover:underline">Inventory</Link> and create or select products
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">2.</span>
            <span>Enable &quot;List in Marketplace&quot; for each product you want to sell</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">3.</span>
            <span>Choose marketplace categories for your products</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">4.</span>
            <span>Wait for approval (usually within 24 hours)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">5.</span>
            <span>Your products will appear in the <Link href="/marketplace" className="text-blue-600 hover:underline">MadeBuy Marketplace</Link></span>
          </li>
        </ol>
      </div>

      {/* Seller Profile */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Your Seller Profile</h2>
          <Link
            href="/dashboard/marketplace/profile"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            Edit Profile
          </Link>
        </div>

        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"></div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-gray-900">{tenant.businessName}</h3>
            <p className="mb-2 text-sm text-gray-600">
              {tenant.description || 'Add a description to help buyers discover your shop'}
            </p>
            {!tenant.description && (
              <Link
                href="/dashboard/marketplace/profile"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Complete your profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Featured Placement (Business+ only) */}
      {access.canFeature ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Featured Placements</h2>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
              Business Plan
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Boost your products with featured placements on the marketplace homepage and category pages.
          </p>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
            Create Featured Placement
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Upgrade for Featured Placements</h3>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            Get your products featured on the homepage and category pages with Business plan.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Upgrade to Business
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      )}

      {/* Placeholder message */}
      <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          <strong>Coming Soon:</strong> Real marketplace stats will be loaded from the API once you start listing products.
        </p>
      </div>
    </div>
  )
}
