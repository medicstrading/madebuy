import { requireTenant } from '@/lib/session'
import { canAccessMarketplace } from '@/lib/marketplace'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Seller Profile - MadeBuy Admin',
}

export default async function SellerProfilePage() {
  const tenant = await requireTenant()

  // Check marketplace access
  if (!canAccessMarketplace(tenant)) {
    redirect('/dashboard/marketplace')
  }

  // TODO: Fetch seller profile from API
  // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketplace/stats`)
  // const { profile } = await response.json()

  return (
    <div>
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Seller Profile</h1>
        <p className="mt-2 text-gray-600">
          Customize how your shop appears in the marketplace
        </p>
      </div>

      <form className="space-y-8">
        {/* Profile Image */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Profile Images</h2>

          <div className="space-y-6">
            {/* Avatar */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Shop Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"></div>
                <div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Change Avatar
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: Square image, at least 400x400px
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Cover Image
              </label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-40 rounded-lg bg-gradient-to-r from-blue-600 to-purple-700"></div>
                <div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Change Cover
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: 1600x400px
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-gray-700">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                defaultValue={tenant.businessName}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your shop name"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is how your shop will appear in the marketplace
              </p>
            </div>

            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                id="location"
                defaultValue={tenant.location || ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="City, State or Country"
              />
            </div>

            <div>
              <label htmlFor="bio" className="mb-2 block text-sm font-medium text-gray-700">
                Shop Bio *
              </label>
              <textarea
                id="bio"
                rows={4}
                defaultValue={tenant.description || ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Tell buyers about your shop, what you make, and what makes you unique..."
              />
              <p className="mt-1 text-xs text-gray-500">
                A compelling bio helps buyers connect with your story (max 500 characters)
              </p>
            </div>
          </div>
        </div>

        {/* Shop Policies */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Shop Policies</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="processingTime" className="mb-2 block text-sm font-medium text-gray-700">
                Processing Time
              </label>
              <input
                type="text"
                id="processingTime"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., 1-3 business days"
              />
            </div>

            <div>
              <label htmlFor="shippingPolicy" className="mb-2 block text-sm font-medium text-gray-700">
                Shipping Policy
              </label>
              <textarea
                id="shippingPolicy"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe your shipping methods, timeframes, and any restrictions..."
              />
            </div>

            <div>
              <label htmlFor="returnPolicy" className="mb-2 block text-sm font-medium text-gray-700">
                Return Policy
              </label>
              <textarea
                id="returnPolicy"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Explain your return and exchange policy..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I offer customization on request
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Social Links</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="website" className="mb-2 block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                id="website"
                defaultValue={tenant.customDomain || ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <label htmlFor="instagram" className="mb-2 block text-sm font-medium text-gray-700">
                Instagram
              </label>
              <input
                type="text"
                id="instagram"
                defaultValue={tenant.instagram || ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="@username"
              />
            </div>

            <div>
              <label htmlFor="facebook" className="mb-2 block text-sm font-medium text-gray-700">
                Facebook
              </label>
              <input
                type="text"
                id="facebook"
                defaultValue={tenant.facebook || ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="facebook.com/yourpage"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
          <Link
            href="/dashboard/marketplace"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>

        {/* Placeholder message */}
        <div className="rounded-lg bg-blue-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            <strong>Coming Soon:</strong> Profile updates will be saved via the API. Form is ready for integration.
          </p>
        </div>
      </form>
    </div>
  )
}
