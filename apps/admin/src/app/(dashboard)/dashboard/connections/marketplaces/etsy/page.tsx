import { requireTenant } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, RefreshCw, Settings, Unlink } from 'lucide-react'

export const metadata = {
  title: 'Etsy Connection - MadeBuy Admin',
}

export default async function EtsyConnectionPage() {
  const tenant = await requireTenant()

  if (!tenant.integrations?.etsy) {
    redirect('/dashboard/connections/marketplaces')
  }

  const etsy = tenant.integrations.etsy

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/connections/marketplaces"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Marketplaces
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Etsy Connection</h1>
        <p className="mt-2 text-gray-600">
          Manage your Etsy marketplace integration
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-green-900">Connected to Etsy</h3>
            <p className="mt-1 text-sm text-green-700">
              Shop: <span className="font-medium">{etsy.shopName}</span>
            </p>
            <p className="text-sm text-green-700">
              Shop ID: <span className="font-mono text-xs">{etsy.shopId}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://www.etsy.com/shop/${etsy.shopName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Shop
            </a>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
          <Settings className="mr-2 h-5 w-5" />
          Sync Settings
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-medium text-gray-900">Auto-Sync</h3>
              <p className="text-sm text-gray-600">
                Automatically sync inventory changes to Etsy
              </p>
            </div>
            <div className="flex items-center">
              <span
                className={`text-sm font-medium ${
                  etsy.autoSync ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {etsy.autoSync ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-medium text-gray-900">Sync Direction</h3>
              <p className="text-sm text-gray-600">
                How inventory syncs between MadeBuy and Etsy
              </p>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900">
                {etsy.syncDirection === 'one_way'
                  ? 'MadeBuy → Etsy'
                  : 'Two-way sync'}
              </span>
            </div>
          </div>

          {etsy.shippingProfileId && (
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-medium text-gray-900">Shipping Profile</h3>
                <p className="text-sm text-gray-600">
                  Default shipping profile for new listings
                </p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  ID: {etsy.shippingProfileId}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Last Sync</h3>
              <p className="text-sm text-gray-600">
                Most recent inventory synchronization
              </p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {etsy.lastSyncAt
                  ? new Date(etsy.lastSyncAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <form action="/api/marketplaces/etsy/sync" method="POST">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </button>
          </form>
          <Link
            href="/dashboard/connections/marketplaces/etsy/settings"
            className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Settings
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-red-900">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-red-900">Disconnect Etsy</h3>
            <p className="text-sm text-red-700">
              Remove the Etsy connection. Existing listings will remain on Etsy.
            </p>
          </div>
          <form action="/api/marketplaces/etsy/disconnect" method="POST">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
