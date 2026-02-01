'use client'

import type { MediaItem, SocialPlatform } from '@madebuy/shared'
import {
  CheckCircle,
  Edit,
  ExternalLink,
  Eye,
  Plus,
  Share2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CompleteStepProps {
  pieceName: string
  pieceId: string
  tenantSlug: string
  mediaItems: MediaItem[]
  marketplaces: {
    storefront: boolean
    etsy: boolean
    ebay: boolean
  }
  socialPlatforms: SocialPlatform[]
  socialScheduled: boolean
  socialScheduleTime: Date | null
  onAddAnother: () => void
}

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
}

export function CompleteStep({
  pieceName,
  pieceId,
  tenantSlug,
  mediaItems,
  marketplaces,
  socialPlatforms,
  socialScheduled,
  socialScheduleTime,
  onAddAnother,
}: CompleteStepProps) {
  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = `${webBaseUrl}/${tenantSlug}`
  const itemUrl = `${storefrontUrl}/${pieceId}`

  const primaryMedia = mediaItems[0]

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">You&apos;re Live!</h2>
        <p className="mt-2 text-lg text-gray-600">
          &ldquo;{pieceName}&rdquo; is now available
        </p>
      </div>

      {/* Preview card */}
      {primaryMedia && (
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-100">
          <div className="relative aspect-square">
            <Image
              src={
                primaryMedia.variants.large?.url ||
                primaryMedia.variants.original.url
              }
              alt={pieceName}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-gray-900">{pieceName}</h3>
            <Link
              href={itemUrl}
              target="_blank"
              className="mt-1 inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
            >
              View listing
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="space-y-3">
        {/* Storefront */}
        {marketplaces.storefront && (
          <StatusRow
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            label="Your storefront"
            status="Live"
            statusColor="text-green-600"
            action={
              <Link
                href={itemUrl}
                target="_blank"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View →
              </Link>
            }
          />
        )}

        {/* Etsy */}
        {marketplaces.etsy && (
          <StatusRow
            icon={
              <div className="h-5 w-5 animate-pulse rounded-full bg-orange-400" />
            }
            label="Etsy"
            status="Syncing..."
            statusColor="text-orange-600"
          />
        )}

        {/* eBay */}
        {marketplaces.ebay && (
          <StatusRow
            icon={
              <div className="h-5 w-5 animate-pulse rounded-full bg-blue-400" />
            }
            label="eBay"
            status="Syncing..."
            statusColor="text-blue-600"
          />
        )}

        {/* Social platforms */}
        {socialPlatforms.map((platform) => (
          <StatusRow
            key={platform}
            icon={
              socialScheduled ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs">
                  ⏰
                </div>
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )
            }
            label={PLATFORM_NAMES[platform] || platform}
            status={
              socialScheduled && socialScheduleTime
                ? `Scheduled for ${socialScheduleTime.toLocaleDateString()} at ${socialScheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Posted'
            }
            statusColor={socialScheduled ? 'text-purple-600' : 'text-green-600'}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl bg-gray-50 p-6">
        <p className="text-sm font-medium text-gray-700 mb-4">Quick actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionButton
            href={`/dashboard/inventory/${pieceId}`}
            icon={<Edit className="h-5 w-5" />}
            label="Edit details"
          />
          <ActionButton
            href={itemUrl}
            target="_blank"
            icon={<Eye className="h-5 w-5" />}
            label="View listing"
          />
          <ActionButton
            href="/dashboard/content"
            icon={<Share2 className="h-5 w-5" />}
            label="Share more"
          />
          <button
            onClick={onAddAnother}
            className="flex flex-col items-center gap-2 rounded-xl bg-white border-2 border-dashed border-gray-300 p-4 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Add another</span>
          </button>
        </div>
      </div>

      {/* Main CTA */}
      <div className="flex justify-center gap-4">
        <Link
          href="/dashboard/inventory"
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Inventory
        </Link>
        <button
          onClick={onAddAnother}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md transition-all"
        >
          Add Another Item
        </button>
      </div>
    </div>
  )
}

interface StatusRowProps {
  icon: React.ReactNode
  label: string
  status: string
  statusColor: string
  action?: React.ReactNode
}

function StatusRow({
  icon,
  label,
  status,
  statusColor,
  action,
}: StatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium ${statusColor}`}>{status}</span>
        {action}
      </div>
    </div>
  )
}

interface ActionButtonProps {
  href: string
  target?: string
  icon: React.ReactNode
  label: string
}

function ActionButton({ href, target, icon, label }: ActionButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-200 p-4 text-gray-600 hover:border-purple-200 hover:text-purple-600 transition-colors"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}
