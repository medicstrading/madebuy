import Link from 'next/link'
import { ArrowUpRight, Check, Lock } from 'lucide-react'
import type { Tenant } from '@madebuy/shared'
import { getWebsiteDesignUpgradeMessage } from '@/lib/website-design'

interface DesignFeatureGateProps {
  tenant: Tenant
  feature: 'banner' | 'typography' | 'layout' | 'sections' | 'blog'
  hasAccess: boolean
  children: React.ReactNode
}

export function DesignFeatureGate({ tenant, feature, hasAccess, children }: DesignFeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>
  }

  const message = getWebsiteDesignUpgradeMessage(tenant, feature)

  const features =
    feature === 'banner'
      ? [
          'Upload custom hero banners',
          '5 AI-generated presets',
          'Overlay text and CTAs',
          'Customizable opacity and height',
        ]
      : feature === 'typography'
      ? [
          '5 professional font combinations',
          'Google Fonts integration',
          'Optimized for readability',
          'Heading and body font pairing',
        ]
      : feature === 'layout'
      ? [
          '4 homepage layout templates',
          'Classic Store layout',
          'Minimal Showcase layout',
          'Featured Focus & Magazine styles',
        ]
      : feature === 'sections'
      ? [
          '7 flexible content section types',
          'Drag-to-reorder sections',
          'Hero, features, testimonials, CTAs',
          'Gallery, text-image, and FAQ blocks',
        ]
      : [
          'Built-in blog system',
          'Rich text editor (TipTap)',
          'SEO optimization',
          'Draft/publish workflow',
        ]

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1">
            <Lock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">
              {feature === 'banner'
                ? 'Pro Feature'
                : feature === 'typography'
                ? 'Pro Feature'
                : feature === 'layout'
                ? 'Pro Feature'
                : 'Business Feature'}
            </span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">{message.title}</h2>
          <p className="text-gray-700">{message.description}</p>
          <div className="mt-2 text-sm text-gray-600">
            Current plan: <span className="font-semibold capitalize">{tenant.plan}</span>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-3 w-3" />
              </div>
              <p className="text-gray-700">{feature}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            {message.ctaText}
            {message.price && <span className="ml-1">- {message.price}</span>}
            <ArrowUpRight className="h-5 w-5" />
          </Link>
          <Link href="/pricing" className="text-blue-600 hover:text-blue-700 hover:underline">
            Compare Plans
          </Link>
        </div>
      </div>

      {/* Show locked preview */}
      <div className="relative">
        <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-white px-6 py-4 shadow-xl">
            <div className="flex items-center gap-2 text-gray-700">
              <Lock className="h-5 w-5" />
              <span className="font-semibold">Upgrade to unlock this feature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
