import { requireTenant } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Connect Etsy - MadeBuy Admin',
}

export default async function ConnectEtsyPage() {
  const tenant = await requireTenant()

  // If already connected, redirect to settings
  if (tenant.integrations?.etsy) {
    redirect('/dashboard/connections/marketplaces/etsy')
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Connect to Etsy</h1>
        <p className="mt-2 text-gray-600">
          Link your Etsy shop to sync inventory automatically
        </p>
      </div>

      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          What You&apos;ll Need
        </h2>
        <ul className="mb-6 space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>An active Etsy seller account</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>At least one shipping profile set up in your Etsy shop</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Permission to manage listings and inventory</span>
          </li>
        </ul>

        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          What Happens Next
        </h2>
        <ol className="mb-8 space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>
              You&apos;ll be redirected to Etsy to authorize MadeBuy to access your
              shop
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>Grant the requested permissions (read and write listings)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>You&apos;ll be brought back to configure your sync settings</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">4.</span>
            <span>
              Choose which pieces to sync or sync your entire inventory
            </span>
          </li>
        </ol>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h3 className="mb-2 font-semibold text-orange-900">Important</h3>
          <p className="text-sm text-orange-800">
            MadeBuy will create new listings on Etsy for your jewelry pieces. We
            won&apos;t modify or delete any existing Etsy listings that weren&apos;t
            created through MadeBuy.
          </p>
        </div>

        <div className="mt-8 flex gap-3">
          <form action="/api/marketplaces/etsy/auth" method="POST">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-orange-500 px-6 py-3 text-base font-medium text-white hover:bg-orange-600"
            >
              Connect to Etsy
              <ExternalLink className="ml-2 h-5 w-5" />
            </button>
          </form>
          <Link
            href="/dashboard/connections/marketplaces"
            className="inline-flex items-center rounded-md bg-gray-100 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
