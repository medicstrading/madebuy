import { requireTenant } from '@/lib/session'
import Link from 'next/link'
import { Store, CheckCircle2, XCircle } from 'lucide-react'

export const metadata = {
  title: 'Marketplaces - MadeBuy Admin',
}

export default async function MarketplacesPage() {
  const tenant = await requireTenant()

  const etsyConnected = !!tenant.integrations?.etsy

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplaces</h1>
        <p className="mt-2 text-gray-600">
          Connect to Etsy, Shopify, and other craft marketplaces to sync your inventory
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* Etsy */}
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-orange-500 p-3">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Etsy</h3>
                  {etsyConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Sell your handmade jewelry on Etsy marketplace
                </p>

                {etsyConnected ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-600">Shop:</span>{' '}
                      <span className="font-medium">
                        {tenant.integrations?.etsy?.shopName}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Auto-sync:</span>{' '}
                      <span className="font-medium">
                        {tenant.integrations?.etsy?.autoSync ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {tenant.integrations?.etsy?.lastSyncAt && (
                      <div className="text-sm text-gray-500">
                        Last synced:{' '}
                        {new Date(tenant.integrations?.etsy?.lastSyncAt).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Link
                        href="/dashboard/connections/marketplaces/etsy"
                        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Link
                      href="/dashboard/connections/marketplaces/etsy/connect"
                      className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                      Connect Etsy
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shopify - Coming Soon */}
        <div className="overflow-hidden rounded-lg border bg-white opacity-60 shadow-sm">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-green-600 p-3">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Shopify
                  <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Coming Soon
                  </span>
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Sync with your existing Shopify store
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-orange-200 bg-orange-50 p-6">
        <h3 className="font-semibold text-orange-900">Why Connect Marketplaces?</h3>
        <ul className="mt-3 space-y-2 text-sm text-orange-800">
          <li>• Automatically sync your inventory across all sales channels</li>
          <li>• Reduce stock when orders come in from any marketplace</li>
          <li>• Manage everything from one dashboard</li>
          <li>• Reach more customers on popular craft marketplaces</li>
        </ul>
      </div>
    </div>
  )
}
