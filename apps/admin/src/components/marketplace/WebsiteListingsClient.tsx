'use client'

import type { Piece, PieceStatus } from '@madebuy/shared'
import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  FolderOpen,
  Globe,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface PieceWithThumbnail extends Piece {
  thumbnailUrl?: string
}

interface CollectionInfo {
  id: string
  name: string
  slug: string
}

interface WebsiteListingsClientProps {
  pieces: PieceWithThumbnail[]
  tenantSlug: string
  collections: CollectionInfo[]
  pieceCollectionsMap: Record<string, { id: string; name: string }[]>
}

type FilterTab = 'all' | PieceStatus

const statusConfig: Record<
  PieceStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  available: {
    label: 'Available',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: CheckCircle,
  },
  reserved: {
    label: 'Reserved',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: Clock,
  },
  sold: {
    label: 'Sold',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: ShoppingBag,
  },
}

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'draft', label: 'Draft' },
]

export function WebsiteListingsClient({
  pieces,
  tenantSlug,
  collections,
  pieceCollectionsMap,
}: WebsiteListingsClientProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(
    null,
  )
  const [collectionsDropdownOpen, setCollectionsDropdownOpen] = useState<
    string | null
  >(null)
  const [togglingFeatured, setTogglingFeatured] = useState<Set<string>>(
    new Set(),
  )
  const [updatingCollections, setUpdatingCollections] = useState<Set<string>>(
    new Set(),
  )
  const [collectionInput, setCollectionInput] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)

  // Local state for optimistic collection updates
  const [localCollectionsMap, setLocalCollectionsMap] =
    useState(pieceCollectionsMap)

  // Filter pieces based on active tab
  const filteredPieces = useMemo(() => {
    if (activeFilter === 'all') return pieces
    return pieces.filter((p) => p.status === activeFilter)
  }, [pieces, activeFilter])

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: pieces.length,
      available: pieces.filter((p) => p.status === 'available').length,
      reserved: pieces.filter((p) => p.status === 'reserved').length,
      sold: pieces.filter((p) => p.status === 'sold').length,
      draft: pieces.filter((p) => p.status === 'draft').length,
    }),
    [pieces],
  )

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPieces.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPieces.map((p) => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Update piece status - if multiple selected, update all of them
  const updateStatus = async (pieceId: string, newStatus: PieceStatus) => {
    // If this piece is selected and there are multiple selections, update all selected
    const idsToUpdate =
      selectedIds.has(pieceId) && selectedIds.size > 1
        ? Array.from(selectedIds)
        : [pieceId]

    // Mark all as updating
    idsToUpdate.forEach((id) => setUpdatingIds((prev) => new Set(prev).add(id)))
    setStatusDropdownOpen(null)
    setActionMenuOpen(null)

    try {
      if (idsToUpdate.length > 1) {
        // Bulk update
        const response = await fetch('/api/pieces/bulk-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pieceIds: idsToUpdate, status: newStatus }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update')
        }

        setSelectedIds(new Set())
      } else {
        // Single update
        const response = await fetch(`/api/pieces/${pieceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update')
        }
      }

      router.refresh()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    } finally {
      idsToUpdate.forEach((id) =>
        setUpdatingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        }),
      )
    }
  }

  // Filter collections by input
  const filteredCollections = useMemo(() => {
    if (!collectionInput.trim()) return collections
    const search = collectionInput.toLowerCase()
    return collections.filter((c) => c.name.toLowerCase().includes(search))
  }, [collections, collectionInput])

  // Check if typed name matches an existing collection exactly
  const exactCollectionMatch = collections.find(
    (c) => c.name.toLowerCase() === collectionInput.trim().toLowerCase(),
  )

  // Create new collection and add piece(s) to it
  const createCollectionAndAdd = async (
    pieceId: string,
    collectionName: string,
  ) => {
    const idsToUpdate =
      selectedIds.has(pieceId) && selectedIds.size > 1
        ? Array.from(selectedIds)
        : [pieceId]

    setCreatingCollection(true)
    try {
      const response = await fetch('/api/pieces/bulk-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieceIds: idsToUpdate,
          newCollectionName: collectionName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create collection')
      }

      setCollectionInput('')
      setCollectionsDropdownOpen(null)
      if (idsToUpdate.length > 1) {
        setSelectedIds(new Set())
      }
      router.refresh()
    } catch (err: any) {
      alert(`Failed to create collection: ${err.message}`)
    } finally {
      setCreatingCollection(false)
    }
  }

  // Toggle featured status
  const toggleFeatured = async (pieceId: string, currentFeatured: boolean) => {
    setTogglingFeatured((prev) => new Set(prev).add(pieceId))

    try {
      const response = await fetch(`/api/pieces/${pieceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }

      router.refresh()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    } finally {
      setTogglingFeatured((prev) => {
        const next = new Set(prev)
        next.delete(pieceId)
        return next
      })
    }
  }

  // Toggle collection membership - if multiple selected, update all of them
  const toggleCollection = async (
    pieceId: string,
    collectionId: string,
    isCurrentlyIn: boolean,
  ) => {
    // If this piece is selected and there are multiple selections, update all selected
    const idsToUpdate =
      selectedIds.has(pieceId) && selectedIds.size > 1
        ? Array.from(selectedIds)
        : [pieceId]

    // Mark all as updating
    idsToUpdate.forEach((id) => {
      const key = `${id}-${collectionId}`
      setUpdatingCollections((prev) => new Set(prev).add(key))
    })

    // Optimistic update for all pieces
    setLocalCollectionsMap((prev) => {
      const updated = { ...prev }
      const collection = collections.find((c) => c.id === collectionId)

      idsToUpdate.forEach((id) => {
        const current = updated[id] || []
        if (isCurrentlyIn) {
          updated[id] = current.filter((c) => c.id !== collectionId)
        } else if (collection) {
          // Only add if not already in
          if (!current.some((c) => c.id === collectionId)) {
            updated[id] = [
              ...current,
              { id: collection.id, name: collection.name },
            ]
          }
        }
      })

      return updated
    })

    try {
      if (idsToUpdate.length > 1 && !isCurrentlyIn) {
        // Bulk add to collection
        const response = await fetch('/api/pieces/bulk-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pieceIds: idsToUpdate, collectionId }),
        })

        if (!response.ok) {
          setLocalCollectionsMap(pieceCollectionsMap)
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update')
        }

        setSelectedIds(new Set())
      } else {
        // Single update or bulk remove (do one by one for removes)
        for (const id of idsToUpdate) {
          const response = await fetch(`/api/pieces/${id}/collections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collectionId,
              action: isCurrentlyIn ? 'remove' : 'add',
            }),
          })

          if (!response.ok) {
            setLocalCollectionsMap(pieceCollectionsMap)
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to update')
          }
        }

        if (idsToUpdate.length > 1) {
          setSelectedIds(new Set())
        }
      }

      router.refresh()
    } catch (err: any) {
      alert(`Failed to update collections: ${err.message}`)
    } finally {
      idsToUpdate.forEach((id) => {
        const key = `${id}-${collectionId}`
        setUpdatingCollections((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
    }
  }

  const formatCurrency = (
    amount: number | undefined,
    currency: string = 'AUD',
  ) => {
    if (amount === undefined) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            Website Listings
          </h1>
          <p className="mt-1 text-gray-500">
            Manage products listed on your storefront
          </p>
        </div>
        <Link
          href={`https://${tenantSlug}.madebuy.com.au`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          View Store
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Products</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">Available</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">
            {stats.available}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-sm font-medium text-amber-600">Reserved</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">
            {stats.reserved}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
          <p className="text-sm font-medium text-blue-600">Sold</p>
          <p className="mt-1 text-3xl font-bold text-blue-700">{stats.sold}</p>
        </div>
      </div>

      {/* Filter Tabs + Bulk Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {filterTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-all',
                activeFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className="ml-1.5 text-xs text-gray-400">
                  {stats[tab.value as keyof typeof stats]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selection indicator */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.size} selected
            </span>
            <span className="text-xs text-blue-600">
              Use any row&apos;s dropdown to update all selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Listings Table */}
      {filteredPieces.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeFilter === 'all'
              ? 'No products yet'
              : `No ${activeFilter} products`}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeFilter === 'all'
              ? 'Add products from the inventory page to list them on your website.'
              : `You don't have any ${activeFilter} products.`}
          </p>
          {activeFilter === 'all' && (
            <Link
              href="/dashboard/inventory"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Package className="h-4 w-4" />
              Go to Inventory
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredPieces.length &&
                      filteredPieces.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Collections
                </th>
                <th className="w-12 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Star className="h-4 w-4 mx-auto text-gray-400" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="w-20 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPieces.map((piece) => {
                const status = statusConfig[piece.status]
                const StatusIcon = status.icon
                const isUpdating = updatingIds.has(piece.id)
                const isSelected = selectedIds.has(piece.id)

                return (
                  <tr
                    key={piece.id}
                    className={cn(
                      'group transition-colors',
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(piece.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {piece.thumbnailUrl ? (
                            <Image
                              src={piece.thumbnailUrl}
                              alt={piece.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-full w-full p-2.5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {piece.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {piece.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(piece.price, piece.currency)}
                      </p>
                    </td>
                    {/* Collections */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setCollectionsDropdownOpen(
                              collectionsDropdownOpen === piece.id
                                ? null
                                : piece.id,
                            )
                          }
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                        >
                          {(() => {
                            const pieceCollections =
                              localCollectionsMap[piece.id] || []
                            if (pieceCollections.length === 0) {
                              return (
                                <span className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
                                  <FolderOpen className="h-4 w-4" />
                                  <span className="text-xs">
                                    Add to collection
                                  </span>
                                </span>
                              )
                            }
                            const displayCollections = pieceCollections.slice(
                              0,
                              2,
                            )
                            const moreCount = pieceCollections.length - 2
                            return (
                              <div className="flex flex-wrap items-center gap-1">
                                {displayCollections.map((c) => (
                                  <span
                                    key={c.id}
                                    className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                                  >
                                    {c.name}
                                  </span>
                                ))}
                                {moreCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    +{moreCount}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </button>

                        {collectionsDropdownOpen === piece.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => {
                                setCollectionsDropdownOpen(null)
                                setCollectionInput('')
                              }}
                            />
                            <div
                              className="absolute left-0 z-20 mt-1 w-64 origin-top-left rounded-lg border border-gray-200 bg-white shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-2">
                                {/* Input for typing collection name */}
                                <input
                                  type="text"
                                  value={collectionInput}
                                  onChange={(e) =>
                                    setCollectionInput(e.target.value)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation()
                                    if (
                                      e.key === 'Enter' &&
                                      collectionInput.trim() &&
                                      !exactCollectionMatch
                                    ) {
                                      createCollectionAndAdd(
                                        piece.id,
                                        collectionInput,
                                      )
                                    }
                                  }}
                                  placeholder="Type collection name..."
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />

                                {/* Create new collection option */}
                                {collectionInput.trim() &&
                                  !exactCollectionMatch && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        createCollectionAndAdd(
                                          piece.id,
                                          collectionInput,
                                        )
                                      }
                                      disabled={creatingCollection}
                                      className="mt-2 flex w-full items-center gap-2 rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                                    >
                                      {creatingCollection ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                      Create &ldquo;{collectionInput.trim()}
                                      &rdquo;
                                    </button>
                                  )}

                                {/* Existing collections */}
                                {filteredCollections.length > 0 && (
                                  <>
                                    <p className="mt-2 px-1 py-1 text-xs font-semibold text-gray-400 uppercase">
                                      {collectionInput.trim()
                                        ? 'Matching'
                                        : 'Existing'}{' '}
                                      Collections
                                    </p>
                                    <div className="max-h-40 overflow-y-auto">
                                      {filteredCollections.map((collection) => {
                                        const isIn = (
                                          localCollectionsMap[piece.id] || []
                                        ).some((c) => c.id === collection.id)
                                        const isUpdating =
                                          updatingCollections.has(
                                            `${piece.id}-${collection.id}`,
                                          )
                                        return (
                                          <button
                                            type="button"
                                            key={collection.id}
                                            onClick={() =>
                                              toggleCollection(
                                                piece.id,
                                                collection.id,
                                                isIn,
                                              )
                                            }
                                            disabled={isUpdating}
                                            className={cn(
                                              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                              isIn
                                                ? 'bg-purple-50 text-purple-700'
                                                : 'text-gray-700 hover:bg-gray-50',
                                            )}
                                          >
                                            <div
                                              className={cn(
                                                'flex h-4 w-4 items-center justify-center rounded border',
                                                isIn
                                                  ? 'border-purple-600 bg-purple-600'
                                                  : 'border-gray-300',
                                              )}
                                            >
                                              {isUpdating ? (
                                                <Loader2 className="h-3 w-3 animate-spin text-white" />
                                              ) : isIn ? (
                                                <Check className="h-3 w-3 text-white" />
                                              ) : null}
                                            </div>
                                            {collection.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </>
                                )}

                                {filteredCollections.length === 0 &&
                                  !collectionInput.trim() && (
                                    <p className="mt-2 px-2 py-2 text-sm text-gray-500">
                                      No collections yet. Type to create one.
                                    </p>
                                  )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    {/* Featured */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFeatured(piece.id, piece.isFeatured)
                        }
                        disabled={togglingFeatured.has(piece.id)}
                        className={cn(
                          'transition-colors',
                          togglingFeatured.has(piece.id) && 'opacity-50',
                        )}
                        title={
                          piece.isFeatured
                            ? 'Remove from featured'
                            : 'Add to featured'
                        }
                      >
                        {togglingFeatured.has(piece.id) ? (
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        ) : (
                          <Star
                            className={cn(
                              'h-5 w-5 transition-colors',
                              piece.isFeatured
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 hover:text-amber-400',
                            )}
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {/* Status dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDropdownOpen(
                              statusDropdownOpen === piece.id ? null : piece.id,
                            )
                          }
                          disabled={isUpdating}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all',
                            status.bgColor,
                            status.color,
                            'hover:ring-2 hover:ring-offset-1',
                            isUpdating && 'opacity-50',
                          )}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <StatusIcon className="h-3 w-3" />
                          )}
                          {status.label}
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        {statusDropdownOpen === piece.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setStatusDropdownOpen(null)}
                            />
                            <div className="absolute left-0 z-20 mt-1 w-40 origin-top-left rounded-lg border border-gray-200 bg-white shadow-lg">
                              <div className="py-1">
                                {(
                                  [
                                    'available',
                                    'reserved',
                                    'sold',
                                    'draft',
                                  ] as PieceStatus[]
                                ).map((s) => {
                                  const cfg = statusConfig[s]
                                  const Icon = cfg.icon
                                  const isActive = piece.status === s

                                  return (
                                    <button
                                      type="button"
                                      key={s}
                                      onClick={() => updateStatus(piece.id, s)}
                                      className={cn(
                                        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                                        isActive
                                          ? `${cfg.bgColor} ${cfg.color}`
                                          : 'text-gray-700 hover:bg-gray-50',
                                      )}
                                    >
                                      <Icon className="h-4 w-4" />
                                      {cfg.label}
                                      {isActive && (
                                        <Check className="ml-auto h-4 w-4" />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === piece.id ? null : piece.id,
                            )
                          }
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {actionMenuOpen === piece.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg">
                              <div className="py-1">
                                <Link
                                  href={`/dashboard/inventory/${piece.id}`}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit Product
                                </Link>
                                {piece.isPublishedToWebsite &&
                                  piece.websiteSlug && (
                                    <a
                                      href={`https://${tenantSlug}.madebuy.com.au/${piece.websiteSlug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      onClick={() => setActionMenuOpen(null)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      View on Store
                                    </a>
                                  )}
                                <div className="my-1 border-t border-gray-100" />
                                {(
                                  [
                                    'available',
                                    'reserved',
                                    'sold',
                                    'draft',
                                  ] as PieceStatus[]
                                )
                                  .filter((s) => s !== piece.status)
                                  .map((s) => {
                                    const cfg = statusConfig[s]
                                    const Icon = cfg.icon
                                    return (
                                      <button
                                        type="button"
                                        key={s}
                                        onClick={() =>
                                          updateStatus(piece.id, s)
                                        }
                                        className={cn(
                                          'flex w-full items-center gap-2 px-4 py-2 text-sm',
                                          cfg.color,
                                          'hover:bg-gray-50',
                                        )}
                                      >
                                        <Icon className="h-4 w-4" />
                                        Mark as {cfg.label}
                                      </button>
                                    )
                                  })}
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
