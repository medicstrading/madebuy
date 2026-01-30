'use client'

import type {
  MarketplaceListingStatus,
  MarketplacePlatform,
} from '@madebuy/shared'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface EbayConnectionStatus {
  connected: boolean
  status?: string
  shopName?: string
  sellerId?: string
  lastSyncAt?: string
  lastError?: string
  tokenExpiresAt?: string
}

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
    thumbnailUrl?: string
  } | null
}

interface InventoryPiece {
  id: string
  name: string
  price: number
  stock: number
  status: string
  thumbnailUrl?: string
  description?: string
  category?: string
  sku?: string
  isListedOnEbay?: boolean
}

interface SerializedConnection {
  id: string
  status: string
  accountId: string
  accountName: string
  lastSync: string | null
  tokenExpiresAt: string | null
}

interface SerializedInventoryItem {
  id: string
  name: string
  price: number
  quantity: number
  thumbnailUrl: string | null
  status: string
}

interface EbayMarketplacePageProps {
  connection: SerializedConnection | null
  inventoryItems: SerializedInventoryItem[]
}

type TabId = 'listings' | 'list-items' | 'orders' | 'settings'
type ListingFilter = 'all' | 'active' | 'ended' | 'error' | 'pending'

// =============================================================================
// Status Configuration
// =============================================================================

const statusConfig: Record<
  MarketplaceListingStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: CheckCircle,
  },
  ended: {
    label: 'Ended',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  error: {
    label: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: AlertCircle,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle,
  },
}

// =============================================================================
// Utility Functions
// =============================================================================

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value)
}

// =============================================================================
// Account Status Card
// =============================================================================

function AccountStatusCard({
  connection,
  onRefresh,
  isRefreshing,
}: {
  connection: EbayConnectionStatus | null
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const tokenExpiry = connection?.tokenExpiresAt
    ? new Date(connection.tokenExpiresAt)
    : null
  const isTokenExpiring =
    tokenExpiry && tokenExpiry.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-gray-200">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7">
              <text
                x="1"
                y="17"
                fontSize="12"
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                <tspan fill="#E53238">e</tspan>
                <tspan fill="#0064D2">b</tspan>
                <tspan fill="#F5AF02">a</tspan>
                <tspan fill="#86B817">y</tspan>
              </text>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">eBay Account</h3>
              {connection?.connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </span>
              )}
            </div>
            {connection?.sellerId && (
              <p className="text-sm text-gray-500">
                Seller ID: {connection.sellerId}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
          />
          Sync
        </button>
      </div>

      {/* Status indicators */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Last Sync</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {connection?.lastSyncAt
              ? formatTimeAgo(connection.lastSyncAt)
              : 'Never'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Token Status</p>
          <p
            className={cn(
              'mt-1 text-sm font-semibold',
              isTokenExpiring ? 'text-amber-600' : 'text-emerald-600',
            )}
          >
            {isTokenExpiring ? 'Expiring Soon' : 'Valid'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Account Health</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">Good</p>
        </div>
      </div>

      {/* Error display */}
      {connection?.lastError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Sync Error</p>
              <p className="text-xs text-red-600 mt-0.5">
                {connection.lastError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Stats Cards
// =============================================================================

function StatsCards({ listings }: { listings: ListingWithPiece[] }) {
  const stats = useMemo(() => {
    const active = listings.filter((l) => l.status === 'active')
    const totalValue = active.reduce(
      (sum, l) => sum + (l.lastSyncedPrice || l.piece?.price || 0),
      0,
    )
    const totalQuantity = active.reduce(
      (sum, l) => sum + (l.lastSyncedQuantity || l.piece?.stock || 0),
      0,
    )
    const errors = listings.filter((l) => l.status === 'error').length
    const pending = listings.filter((l) => l.status === 'pending').length

    return {
      total: listings.length,
      active: active.length,
      totalValue,
      totalQuantity,
      errors,
      pending,
    }
  }, [listings])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Listings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.active}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
            <DollarSign className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Listed Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Errors</p>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Listings Tab
// =============================================================================

function ListingsTab({
  listings,
  loading,
  onSync,
  onDelete,
  onRefresh,
  syncing,
  deleting,
}: {
  listings: ListingWithPiece[]
  loading: boolean
  onSync: (id: string) => void
  onDelete: (id: string, name: string) => void
  onRefresh: () => void
  syncing: string | null
  deleting: string | null
}) {
  const [filter, setFilter] = useState<ListingFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedListings, setSelectedListings] = useState<Set<string>>(
    new Set(),
  )

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // Status filter
      if (filter !== 'all' && listing.status !== filter) return false

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const nameMatch = listing.piece?.name
          ?.toLowerCase()
          .includes(searchLower)
        const idMatch = listing.externalListingId
          ?.toLowerCase()
          .includes(searchLower)
        if (!nameMatch && !idMatch) return false
      }

      return true
    })
  }, [listings, filter, search])

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedListings)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedListings(newSelection)
  }

  const toggleAll = () => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set())
    } else {
      setSelectedListings(new Set(filteredListings.map((l) => l.id)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ListingFilter)}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="ended">Ended</option>
              <option value="error">Errors</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedListings.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedListings.size} selected
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Listings table */}
      {filteredListings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No listings found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {filter !== 'all' || search
              ? 'Try adjusting your filters or search query.'
              : 'List items from your inventory to see them here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedListings.size === filteredListings.length &&
                      filteredListings.length > 0
                    }
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Last Synced
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredListings.map((listing) => {
                const status =
                  statusConfig[listing.status] || statusConfig.draft
                const StatusIcon = status.icon
                const isProcessing =
                  syncing === listing.id || deleting === listing.id

                return (
                  <tr
                    key={listing.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedListings.has(listing.id)}
                        onChange={() => toggleSelection(listing.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {listing.piece?.thumbnailUrl ? (
                            <Image
                              src={listing.piece.thumbnailUrl}
                              alt={listing.piece.name || ''}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 max-w-[200px]">
                            {listing.piece?.name || 'Unknown Item'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            ID: {listing.externalListingId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          status.bgColor,
                          status.color,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {listing.syncError && (
                        <p className="mt-1 text-xs text-red-500 line-clamp-1 max-w-[150px]">
                          {listing.syncError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(
                          listing.lastSyncedPrice || listing.piece?.price || 0,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {listing.lastSyncedQuantity ??
                          listing.piece?.stock ??
                          0}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {listing.lastSyncedAt
                        ? formatTimeAgo(listing.lastSyncedAt)
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {listing.externalUrl && (
                          <a
                            href={listing.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View on eBay"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onSync(listing.id)}
                          disabled={isProcessing}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                          title="Sync"
                        >
                          {syncing === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onDelete(
                              listing.id,
                              listing.piece?.name || 'this listing',
                            )
                          }
                          disabled={isProcessing}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="End listing"
                        >
                          {deleting === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
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

// =============================================================================
// List Items Tab
// =============================================================================

// Common eBay categories for handmade/craft items (Australia)
const EBAY_CATEGORIES = [
  { id: '281', name: 'Collectibles (General)' },
  { id: '14339', name: 'Crafts' },
  { id: '73823', name: 'Handcrafted & Finished Pieces' },
  { id: '160668', name: 'Home Décor' },
  { id: '45220', name: 'Art - Paintings' },
  { id: '553', name: 'Art - Prints' },
  { id: '36034', name: 'Jewelry & Watches' },
  { id: '11700', name: 'Clothing, Shoes & Accessories' },
  { id: '26395', name: 'Health & Beauty' },
  { id: '1249', name: 'Toys & Hobbies' },
]

function ListItemsTab({
  existingListings,
  onListItem,
  listing,
  initialInventory,
}: {
  existingListings: ListingWithPiece[]
  onListItem: (
    pieceId: string,
    options: { price?: number; quantity?: number; categoryId?: string },
  ) => Promise<void>
  listing: string | null
  initialInventory: InventoryPiece[]
}) {
  const [inventory] = useState<InventoryPiece[]>(initialInventory)
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [listingItem, setListingItem] = useState<string | null>(null)
  const [configReady, setConfigReady] = useState<boolean | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(
    EBAY_CATEGORIES[0].id,
  )

  // Check if config is ready for listing
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/marketplace/ebay/config')
        if (res.ok) {
          const data = await res.json()
          setConfigReady(data.readyToList)
        }
      } catch (err) {
        console.error('Failed to check config:', err)
      }
    }
    checkConfig()
  }, [])

  // Filter out already-listed items
  const listedPieceIds = useMemo(() => {
    return new Set(
      existingListings
        .filter((l) => l.status === 'active' || l.status === 'pending')
        .map((l) => l.pieceId),
    )
  }, [existingListings])

  const availableItems = useMemo(() => {
    return inventory.filter((item) => {
      // Exclude already listed
      if (listedPieceIds.has(item.id)) return false

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        return item.name.toLowerCase().includes(searchLower)
      }

      return true
    })
  }, [inventory, listedPieceIds, search])

  const handleListItem = async (pieceId: string) => {
    console.log(
      '[ListItemsTab] handleListItem called with pieceId:',
      pieceId,
      'category:',
      selectedCategory,
    )
    setListingItem(pieceId)
    try {
      await onListItem(pieceId, { categoryId: selectedCategory })
      console.log('[ListItemsTab] onListItem completed successfully')
    } catch (err) {
      console.error('[ListItemsTab] onListItem failed:', err)
    } finally {
      setListingItem(null)
    }
  }

  const handleBulkList = async () => {
    for (const pieceId of selectedItems) {
      await handleListItem(pieceId)
    }
    setSelectedItems(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Setup Warning */}
      {configReady === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Setup Required</p>
            <p className="text-sm text-amber-700 mt-1">
              You need to configure eBay Business Policies before you can list
              items. Go to the <strong>Settings</strong> tab to see what&apos;s
              missing.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">List Items to eBay</h3>
          <p className="text-sm text-gray-500">
            Select items from your inventory to list on eBay
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <button
              type="button"
              onClick={handleBulkList}
              disabled={!!listingItem || configReady === false}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              List {selectedItems.size} Item{selectedItems.size > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Search and Category */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search available items..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="ebay-category"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            eBay Category:
          </label>
          <select
            id="ebay-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EBAY_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items grid */}
      {availableItems.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            All items listed!
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            All your available inventory items are already listed on eBay.
          </p>
          <Link
            href="/dashboard/inventory/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add New Item
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.size === availableItems.length &&
                      availableItems.length > 0
                    }
                    onChange={() => {
                      if (selectedItems.size === availableItems.length) {
                        setSelectedItems(new Set())
                      } else {
                        setSelectedItems(
                          new Set(availableItems.map((i) => i.id)),
                        )
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {availableItems.map((item) => {
                const isSelected = selectedItems.has(item.id)
                const isListing = listingItem === item.id || listing === item.id
                const hasImage = !!item.thumbnailUrl
                const hasDescription =
                  item.description && item.description.length >= 10
                const isReady = hasImage && hasDescription && item.price > 0

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const newSelection = new Set(selectedItems)
                          if (isSelected) {
                            newSelection.delete(item.id)
                          } else {
                            newSelection.add(item.id)
                          }
                          setSelectedItems(newSelection)
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 hover:ring-2 hover:ring-blue-300 transition-all"
                        >
                          {item.thumbnailUrl ? (
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/inventory/${item.id}`}
                            className="truncate text-sm font-medium text-gray-900 max-w-[200px] hover:text-blue-600 hover:underline"
                          >
                            {item.name}
                          </Link>
                          {item.sku && (
                            <p className="truncate text-xs text-gray-500">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{item.stock}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Ready
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="flex flex-wrap gap-1 group"
                          title="Click to edit and fix"
                        >
                          {!hasImage && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 group-hover:bg-amber-200 transition-colors">
                              No image
                            </span>
                          )}
                          {!hasDescription && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 group-hover:bg-amber-200 transition-colors">
                              No desc
                            </span>
                          )}
                          {item.price <= 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 group-hover:bg-amber-200 transition-colors">
                              No price
                            </span>
                          )}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isReady && (
                          <Link
                            href={`/dashboard/inventory/${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleListItem(item.id)}
                          disabled={
                            isListing || configReady === false || !isReady
                          }
                          title={
                            !isReady
                              ? 'Fix missing fields before listing'
                              : undefined
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isListing ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Listing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3" />
                              List
                            </>
                          )}
                        </button>
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

// =============================================================================
// Settings Tab
// =============================================================================

interface EbayConfig {
  connected: boolean
  readyToList: boolean
  policiesReady: boolean
  locationReady: boolean
  environment: string
  policies: {
    fulfillment: { configured: boolean }
    payment: { configured: boolean }
    return: { configured: boolean }
  }
  merchantLocation: { configured: boolean }
}

interface EbayPolicies {
  fulfillment: { id: string; name: string }[]
  payment: { id: string; name: string }[]
  return: { id: string; name: string }[]
  locations: { key: string; name: string }[]
  envVars: Record<string, string>
}

function SettingsTab({
  connection,
}: {
  connection: EbayConnectionStatus | null
}) {
  const [config, setConfig] = useState<EbayConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [policies, setPolicies] = useState<EbayPolicies | null>(null)
  const [fetchingPolicies, setFetchingPolicies] = useState(false)
  const [policiesError, setPoliciesError] = useState<string | null>(null)
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [locationForm, setLocationForm] = useState({
    locationKey: 'default',
    name: 'Main Location',
    addressLine1: '',
    city: '',
    stateOrProvince: '',
    postalCode: '',
  })

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/marketplace/ebay/config')
        if (res.ok) {
          setConfig(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch config:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const fetchPolicies = async () => {
    setFetchingPolicies(true)
    setPoliciesError(null)
    try {
      const res = await fetch('/api/marketplace/ebay/policies')
      const data = await res.json()
      console.log('[Settings] Policy fetch response:', data)
      if (res.ok) {
        // Flatten the response structure for the component
        setPolicies({
          fulfillment: data.policies?.fulfillment || [],
          payment: data.policies?.payment || [],
          return: data.policies?.return || [],
          locations: data.policies?.locations || [],
          envVars: data.envVars || {},
        })
        if (data.errors && data.errors.length > 0) {
          setPoliciesError(`Some APIs failed: ${data.errors.join(', ')}`)
        }
      } else {
        setPoliciesError(
          data.error || `Failed to fetch policies (${res.status})`,
        )
      }
    } catch (err: any) {
      console.error('[Settings] Policy fetch error:', err)
      setPoliciesError(`Failed to fetch: ${err.message}`)
    } finally {
      setFetchingPolicies(false)
    }
  }

  const createLocation = async () => {
    setCreatingLocation(true)
    setPoliciesError(null)
    try {
      const res = await fetch('/api/marketplace/ebay/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationForm),
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh policies to show new location
        await fetchPolicies()
      } else {
        setPoliciesError(data.error || 'Failed to create location')
      }
    } catch (err: any) {
      setPoliciesError(`Failed to create location: ${err.message}`)
    } finally {
      setCreatingLocation(false)
    }
  }

  const ConfigItem = ({
    label,
    configured,
  }: {
    label: string
    configured: boolean
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {configured ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
          <CheckCircle className="h-4 w-4" />
          Configured
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          Not Set
        </span>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">eBay Settings</h3>
        <p className="text-sm text-gray-500">
          Configure your eBay integration preferences
        </p>
      </div>

      {/* Configuration Status */}
      <div
        className={cn(
          'rounded-xl border p-6',
          config?.readyToList
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50',
        )}
      >
        <div className="flex items-start gap-3">
          {config?.readyToList ? (
            <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4
              className={cn(
                'font-medium',
                config?.readyToList ? 'text-emerald-900' : 'text-amber-900',
              )}
            >
              {config?.readyToList ? 'Ready to List' : 'Setup Required'}
            </h4>
            <p
              className={cn(
                'text-sm mt-1',
                config?.readyToList ? 'text-emerald-700' : 'text-amber-700',
              )}
            >
              {config?.readyToList
                ? 'Your eBay account is fully configured and ready to create listings.'
                : 'Complete the setup below before you can list items on eBay.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          config &&
          !config.readyToList && (
            <div className="mt-4 pt-4 border-t border-amber-200">
              <p className="text-sm font-medium text-amber-900 mb-2">
                Missing Configuration:
              </p>
              <div className="space-y-1">
                <ConfigItem
                  label="Fulfillment Policy"
                  configured={config.policies.fulfillment.configured}
                />
                <ConfigItem
                  label="Payment Policy"
                  configured={config.policies.payment.configured}
                />
                <ConfigItem
                  label="Return Policy"
                  configured={config.policies.return.configured}
                />
                <ConfigItem
                  label="Merchant Location"
                  configured={config.merchantLocation.configured}
                />
              </div>
              <div className="mt-4 p-3 rounded-lg bg-white border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>How to set up:</strong> Create your policies in eBay
                  Seller Hub, then click the button below to fetch your policy
                  IDs.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Fetch Policy IDs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900">Policy IDs</h4>
            <p className="text-sm text-gray-500">
              Fetch your eBay business policy IDs automatically
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPolicies}
            disabled={fetchingPolicies}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {fetchingPolicies ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Fetch from eBay
              </>
            )}
          </button>
        </div>

        {policiesError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{policiesError}</p>
          </div>
        )}

        {policies && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Add these to your Railway environment variables:
              </p>
              <div className="font-mono text-xs space-y-1 bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                <div>
                  EBAY_FULFILLMENT_POLICY_ID=
                  {policies.envVars.EBAY_FULFILLMENT_POLICY_ID}
                </div>
                <div>
                  EBAY_PAYMENT_POLICY_ID=
                  {policies.envVars.EBAY_PAYMENT_POLICY_ID}
                </div>
                <div>
                  EBAY_RETURN_POLICY_ID={policies.envVars.EBAY_RETURN_POLICY_ID}
                </div>
                <div>
                  EBAY_MERCHANT_LOCATION_KEY=
                  {policies.envVars.EBAY_MERCHANT_LOCATION_KEY}
                </div>
              </div>
            </div>

            {(policies.fulfillment.length > 0 ||
              policies.payment.length > 0 ||
              policies.return.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {policies.fulfillment.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Shipping Policies
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {policies.fulfillment.map((p) => (
                        <li key={p.id} className="flex justify-between">
                          <span>{p.name}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {p.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {policies.payment.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Payment Policies
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {policies.payment.map((p) => (
                        <li key={p.id} className="flex justify-between">
                          <span>{p.name}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {p.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {policies.return.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Return Policies
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {policies.return.map((p) => (
                        <li key={p.id} className="flex justify-between">
                          <span>{p.name}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {p.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {policies.locations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Locations
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {policies.locations.map((l) => (
                        <li key={l.key} className="flex justify-between">
                          <span>{l.name}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {l.key}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {policies.locations.length === 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-3">
                  No merchant location found. Create one below:
                </p>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Location Key
                      </label>
                      <input
                        type="text"
                        value={locationForm.locationKey}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            locationKey: e.target.value,
                          })
                        }
                        className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                        placeholder="default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={locationForm.name}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                        placeholder="Main Location"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-amber-800 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={locationForm.addressLine1}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          addressLine1: e.target.value,
                        })
                      }
                      className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={locationForm.city}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            city: e.target.value,
                          })
                        }
                        className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                        placeholder="Sydney"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={locationForm.stateOrProvince}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            stateOrProvince: e.target.value,
                          })
                        }
                        className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                        placeholder="NSW"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={locationForm.postalCode}
                        onChange={(e) =>
                          setLocationForm({
                            ...locationForm,
                            postalCode: e.target.value,
                          })
                        }
                        className="w-full rounded border border-amber-300 px-2 py-1.5 text-sm"
                        placeholder="2000"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={createLocation}
                    disabled={
                      creatingLocation ||
                      !locationForm.addressLine1 ||
                      !locationForm.city ||
                      !locationForm.postalCode
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {creatingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Location
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Environment Info */}
      {config && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h4 className="font-medium text-gray-900 mb-4">Environment</h4>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                config.environment === 'production'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800',
              )}
            >
              {config.environment === 'production' ? 'Production' : 'Sandbox'}
            </span>
            <span className="text-sm text-gray-500">
              {config.environment === 'production'
                ? 'Connected to live eBay marketplace'
                : 'Connected to eBay sandbox for testing'}
            </span>
          </div>
        </div>
      )}

      {/* Listing Defaults */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h4 className="font-medium text-gray-900 mb-4">Listing Defaults</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Category
            </label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Crafts &gt; Handcrafted Items</option>
              <option>Art &gt; Handmade Art</option>
              <option>Jewelry &gt; Handcrafted Jewelry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Condition
            </label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>New</option>
              <option>New with tags</option>
              <option>New without tags</option>
              <option>Pre-owned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700 mb-4">
          Disconnecting will remove your eBay integration. Active listings will
          remain on eBay but won&apos;t be synced.
        </p>
        <Link
          href="/dashboard/connections?tab=marketplaces"
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Manage Connection
        </Link>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function EbayMarketplacePage({
  connection: initialConnection,
  inventoryItems,
}: EbayMarketplacePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('listings')

  // Convert serialized connection to EbayConnectionStatus format
  const [connection, setConnection] = useState<EbayConnectionStatus | null>(
    initialConnection
      ? {
          connected: initialConnection.status === 'connected',
          status: initialConnection.status,
          sellerId: initialConnection.accountId,
          shopName: initialConnection.accountName,
          lastSyncAt: initialConnection.lastSync || undefined,
          tokenExpiresAt: initialConnection.tokenExpiresAt || undefined,
        }
      : null,
  )

  // Convert inventory items to InventoryPiece format for the List Items tab
  const [availableInventory] = useState<InventoryPiece[]>(
    inventoryItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      stock: item.quantity,
      status: item.status,
      thumbnailUrl: item.thumbnailUrl || undefined,
    })),
  )
  const [listings, setListings] = useState<ListingWithPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [listing, setListing] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/marketplace/ebay/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch connection status
  const fetchConnection = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/marketplace/ebay')
      if (res.ok) {
        setConnection(await res.json())
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Sync single listing
  async function handleSync(listingId: string) {
    setSyncing(listingId)
    try {
      const res = await fetch(
        `/api/marketplace/ebay/listings/${listingId}/sync`,
        { method: 'POST' },
      )
      if (res.ok) {
        await fetchListings()
        setMessage({ type: 'success', text: 'Listing synced successfully' })
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Sync failed')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSyncing(null)
    }
  }

  // Delete listing
  async function handleDelete(listingId: string, name: string) {
    if (!confirm(`Are you sure you want to end "${name}" on eBay?`)) return
    setDeleting(listingId)
    try {
      const res = await fetch(`/api/marketplace/ebay/listings/${listingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchListings()
        setMessage({ type: 'success', text: 'Listing ended successfully' })
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to end listing')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setDeleting(null)
    }
  }

  // List item
  async function handleListItem(
    pieceId: string,
    options: { price?: number; quantity?: number; categoryId?: string },
  ) {
    console.log('[EbayMarketplacePage] handleListItem called with:', {
      pieceId,
      options,
    })
    setListing(pieceId)
    try {
      console.log(
        '[EbayMarketplacePage] Making POST request to /api/marketplace/ebay/listings',
      )
      const res = await fetch('/api/marketplace/ebay/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pieceId, ...options }),
      })
      console.log('[EbayMarketplacePage] Response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[EbayMarketplacePage] Success response:', data)
        await fetchListings()
        setMessage({ type: 'success', text: 'Item listed on eBay!' })
        setActiveTab('listings')
      } else {
        const data = await res.json()
        console.error('[EbayMarketplacePage] Error response:', data)
        // Show detailed error message for missing fields
        if (data.details && Array.isArray(data.details)) {
          throw new Error(`${data.error}: ${data.details.join(', ')}`)
        }
        throw new Error(data.error || 'Failed to list item')
      }
    } catch (err: any) {
      console.error('[EbayMarketplacePage] Exception:', err)
      setMessage({ type: 'error', text: err.message })
    } finally {
      setListing(null)
    }
  }

  // Clear message after timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const tabs: { id: TabId; label: string; icon: typeof Package }[] = [
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'list-items', label: 'List Items', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            eBay
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your eBay listings and sync inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list-items')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            List Item
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl p-4',
            message.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800',
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Account status */}
      <AccountStatusCard
        connection={connection}
        onRefresh={fetchConnection}
        isRefreshing={refreshing}
      />

      {/* Stats */}
      <StatsCards listings={listings} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === 'listings' && (
          <ListingsTab
            listings={listings}
            loading={loading}
            onSync={handleSync}
            onDelete={handleDelete}
            onRefresh={fetchListings}
            syncing={syncing}
            deleting={deleting}
          />
        )}
        {activeTab === 'list-items' && (
          <ListItemsTab
            existingListings={listings}
            onListItem={handleListItem}
            listing={listing}
            initialInventory={availableInventory}
          />
        )}
        {activeTab === 'settings' && <SettingsTab connection={connection} />}
      </div>
    </div>
  )
}
