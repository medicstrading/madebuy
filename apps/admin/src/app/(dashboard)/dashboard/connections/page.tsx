import { requireTenant } from '@/lib/session'
import Link from 'next/link'
import { Instagram, Youtube, Facebook, Music, Share2 } from 'lucide-react'

export const metadata = {
  title: 'Connections - MadeBuy Admin',
}

const connections = [
  {
    name: 'Social Media',
    description: 'Connect Instagram, TikTok, YouTube, Facebook, and Pinterest to publish directly',
    icon: Share2,
    href: '/dashboard/connections/social',
    color: 'bg-blue-500',
  },
  {
    name: 'Music Library',
    description: 'Connect to music APIs for video soundtracks',
    icon: Music,
    href: '/dashboard/connections/music',
    color: 'bg-purple-500',
    comingSoon: true,
  },
  {
    name: 'Marketplaces',
    description: 'Connect to Etsy, Shopify, and other craft marketplaces',
    icon: Instagram,
    href: '/dashboard/connections/marketplaces',
    color: 'bg-green-500',
  },
]

export default async function ConnectionsPage() {
  const tenant = await requireTenant()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
        <p className="mt-2 text-gray-600">
          Connect your accounts and services to streamline your workflow
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => {
          const Icon = connection.icon

          return (
            <Link
              key={connection.name}
              href={connection.comingSoon ? '#' : connection.href}
              className={`relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                connection.comingSoon ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`rounded-lg ${connection.color} p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {connection.name}
                    {connection.comingSoon && (
                      <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Coming Soon
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {connection.description}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">Why Connect?</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>• Publish to multiple platforms from one place</li>
          <li>• Sync your inventory across marketplaces</li>
          <li>• Access music and media libraries for content creation</li>
          <li>• Streamline your multi-channel selling</li>
        </ul>
      </div>
    </div>
  )
}
