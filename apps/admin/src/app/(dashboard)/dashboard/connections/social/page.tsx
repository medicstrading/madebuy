import { requireTenant } from '@/lib/session'
import { SocialConnectionManager } from '@/components/settings/SocialConnectionManager'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata = {
  title: 'Social Media Connections - MadeBuy Admin',
}

export default async function SocialConnectionsPage() {
  const tenant = await requireTenant()

  return (
    <div>
      <Link
        href="/dashboard/connections"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Connections
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Social Media Connections</h1>
      <p className="mt-1 text-gray-600">
        Connect Instagram, TikTok, YouTube, Facebook, and Pinterest to publish directly from MadeBuy
      </p>

      <div className="mt-8">
        <SocialConnectionManager tenant={tenant} />
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900">Supported Platforms</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Instagram (Ready)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">TikTok (Ready)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-500">YouTube (Coming Soon)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-500">Facebook (Coming Soon)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Pinterest (Ready)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
