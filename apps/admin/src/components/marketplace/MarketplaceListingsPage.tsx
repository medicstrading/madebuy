'use client'

import type {
  MarketplaceListingStatus,
  MarketplacePlatform,
} from '@madebuy/shared'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface ListingWithPiece {
  id: string
  pieceId: string
  marketplace: MarketplacePlatform
  externalListingId: string
  externalUrl?: string
  status: MarketplaceListingStatus
  lastSyncedAt?: string
  syncError?: string
  lastSyncedPrice?: number
  lastSyncedQuantity?: number
  createdAt: string
  piece: {
    id: string
    name: string
    price: number
    stock: number
    status: string
  } | null
}

interface MarketplaceListingsPageProps {
  platform: MarketplacePlatform
  platformName: string
  platformColor: string
}

const statusConfig: Record<
  MarketplaceListingStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  ended: { label: 'Ended', color: 'bg-gray-100 text-gray-600', icon: Clock },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-700',
    icon: AlertCircle,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: 'bg-orange-100 text-orange-700',
    icon: AlertCircle,
  },
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function MarketplaceListingsPage({
  platform,
  platformName,
  platformColor,
}: MarketplaceListingsPageProps) {
  const [listings, setListings] = useState<ListingWithPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/marketplace/${platform}/listings`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch listings')
      }

      setListings(data.listings || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [platform])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  async function handleSync(listingId: string) {
    setSyncing(listingId)
    setActionMenuOpen(null)
    try {
      const response = await fetch(
        `/api/marketplace/${platform}/listings/${listingId}/sync`,
        {
          method: 'POST',
        },
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Sync failed')
      }
      await fetchListings()
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(null)
    }
  }

  async function handleDelete(listingId: string, productName: string) {
    if (
      !confirm(
        `Are you sure you want to remove "${productName}" from ${platformName}?`,
      )
    ) {
      return
    }
    setDeleting(listingId)
    setActionMenuOpen(null)
    try {
      const response = await fetch(
        `/api/marketplace/${platform}/listings/${listingId}`,
        {
          method: 'DELETE',
        },
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }
      await fetchListings()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  // Stats
  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === 'active').length,
    errors: listings.filter((l) => l.status === 'error').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {platformName} Listings
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your products listed on {platformName}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchListings}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Total Listings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Errors</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.errors}</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Listings table */}
      {listings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No listings yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            List your products on {platformName} from the inventory page.
          </p>
          <Link
            href="/dashboard/inventory"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Package className="h-4 w-4" />
            Go to Inventory
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price / Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Synced
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {listings.map((listing) => {
                const status =
                  statusConfig[listing.status] || statusConfig.draft
                const StatusIcon = status.icon
                const isProcessing =
                  syncing === listing.id || deleting === listing.id

                return (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${platformColor}`}
                        >
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {listing.piece?.name || 'Unknown Product'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            ID: {listing.externalListingId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {listing.syncError && (
                        <p className="mt-1 text-xs text-red-600 line-clamp-1">
                          {listing.syncError}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        $
                        {listing.lastSyncedPrice?.toFixed(2) ||
                          listing.piece?.price?.toFixed(2) ||
                          '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty:{' '}
                        {listing.lastSyncedQuantity ??
                          listing.piece?.stock ??
                          '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {listing.lastSyncedAt
                        ? formatTimeAgo(listing.lastSyncedAt)
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === listing.id ? null : listing.id,
                            )
                          }
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </button>

                        {actionMenuOpen === listing.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg">
                              <div className="py-1">
                                {listing.externalUrl && (
                                  <a
                                    href={listing.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setActionMenuOpen(null)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    View on {platformName}
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSync(listing.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Sync Now
                                </button>
                                {listing.piece && (
                                  <Link
                                    href={`/dashboard/inventory/${listing.piece.id}`}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setActionMenuOpen(null)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Product
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      listing.id,
                                      listing.piece?.name || 'this listing',
                                    )
                                  }
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove Listing
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
