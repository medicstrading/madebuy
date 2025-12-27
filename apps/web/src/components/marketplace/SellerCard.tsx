import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import type { SellerProfile, SellerBadge } from '@madebuy/shared'

interface SellerCardProps {
  seller: Partial<SellerProfile>
}

const BADGE_STYLES: Record<SellerBadge, { label: string; className: string }> = {
  verified: { label: 'Verified', className: 'bg-blue-100 text-blue-800' },
  top_seller: { label: 'Top Seller', className: 'bg-green-100 text-green-800' },
  responsive: { label: 'Fast Response', className: 'bg-purple-100 text-purple-800' },
  new_seller: { label: 'New', className: 'bg-gray-100 text-gray-800' },
  eco_friendly: { label: 'Eco-Friendly', className: 'bg-emerald-100 text-emerald-800' },
  handmade_verified: { label: 'Handmade', className: 'bg-orange-100 text-orange-800' },
  fast_shipper: { label: 'Fast Shipper', className: 'bg-indigo-100 text-indigo-800' },
  rising_star: { label: 'Rising Star', className: 'bg-yellow-100 text-yellow-800' },
}

export function SellerCard({ seller }: SellerCardProps) {
  const {
    tenantId,
    displayName,
    bio,
    avatar,
    location,
    stats,
    badges,
  } = seller

  return (
    <Link
      href={`/marketplace/seller/${tenantId}`}
      className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      {/* Avatar */}
      <div className="mb-3 h-20 w-20 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"></div>

      {/* Name */}
      <h3 className="mb-1 font-semibold text-gray-900 group-hover:text-blue-600">
        {displayName || 'Seller Name'}
      </h3>

      {/* Location */}
      {location && (
        <div className="mb-2 flex items-center gap-1 text-xs text-gray-600">
          <MapPin className="h-3 w-3" />
          <span>{location}</span>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          {stats.avgRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{stats.avgRating.toFixed(1)}</span>
            </div>
          )}
          {stats.totalSales > 0 && (
            <span className="text-gray-600">{stats.totalSales} sales</span>
          )}
        </div>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {badges.slice(0, 2).map((badge) => {
            const style = BADGE_STYLES[badge] || { label: badge, className: 'bg-gray-100 text-gray-800' }
            return (
              <span
                key={badge}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
              >
                {style.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Bio */}
      {bio && (
        <p className="mt-3 text-xs text-gray-600 line-clamp-2">{bio}</p>
      )}
    </Link>
  )
}
