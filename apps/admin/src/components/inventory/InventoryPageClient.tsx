'use client'

import type { Collection, Piece, PieceStatus } from '@madebuy/shared'
import { calculateProfitMargin, getMarginHealth } from '@madebuy/shared'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { BulkActionsToolbar } from './BulkActionsToolbar'
import { DeletePieceButton } from './DeletePieceButton'

// ============================================================================
// Types
// ============================================================================

interface PieceWithExtras extends Piece {
  cogs: number
  thumbnailUrl?: string
}

interface CollectionInfo {
  id: string
  name: string
  slug: string
}

interface InventoryPageClientProps {
  pieces: PieceWithExtras[]
  collections: Collection[]
  serializedCollections: CollectionInfo[]
  pieceCollectionsMap: Record<string, { id: string; name: string }[]>
  tenantSlug: string
  lowStockCount: number
  outOfStockCount: number
}

type TabId = 'all' | 'website' | 'collections'
type StatusFilter = 'all' | PieceStatus
type MarginHealth = 'healthy' | 'warning' | 'low' | 'negative' | 'unknown'

// ============================================================================
// Constants
// ============================================================================

const VIRTUALIZATION_THRESHOLD = 50
const ROW_HEIGHT = 72

const tabs: { id: TabId; label: string; icon: typeof Package }[] = [
  { id: 'all', label: 'All Items', icon: Package },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
]

const statusConfig: Record<
  PieceStatus,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: typeof CheckCircle
  }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Clock,
  },
  available: {
    label: 'Available',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: CheckCircle,
  },
  reserved: {
    label: 'Reserved',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  sold: {
    label: 'Sold',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: ShoppingBag,
  },
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'draft', label: 'Draft' },
]

// ============================================================================
// Main Component
// ============================================================================

export function InventoryPageClient({
  pieces,
  collections,
  serializedCollections,
  pieceCollectionsMap,
  tenantSlug,
  lowStockCount,
  outOfStockCount,
}: InventoryPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleTabChange = (tab: TabId) => {
    if (tab === activeTab) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTransitioning(false)
    }, 150)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Inventory
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your pieces, listings, and collections
          </p>
        </div>
        <Link
          href="/dashboard/inventory/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Piece
        </Link>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {lowStockCount} item{lowStockCount === 1 ? '' : 's'} need
                  attention
                </p>
                <p className="text-sm text-amber-700">
                  {outOfStockCount > 0 && (
                    <span className="font-medium text-red-700">
                      {outOfStockCount} out of stock
                    </span>
                  )}
                  {outOfStockCount > 0 &&
                    lowStockCount - outOfStockCount > 0 &&
                    ', '}
                  {lowStockCount - outOfStockCount > 0 && (
                    <span>
                      {lowStockCount - outOfStockCount} below threshold
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/inventory/low-stock"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              View Low Stock
            </Link>
          </div>
        </div>
      )}

      {/* Tab Navigation - Craft-Industrial Style */}
      <div className="relative">
        {/* Tab bar background with subtle texture */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                type="button"
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2.5 px-5 py-3 text-sm font-medium transition-all duration-200',
                  'rounded-t-xl border border-b-0',
                  isActive
                    ? 'bg-white text-gray-900 border-gray-200 shadow-sm z-10 -mb-px'
                    : 'bg-gray-50/80 text-gray-500 border-transparent hover:bg-gray-100/80 hover:text-gray-700',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-400 group-hover:text-gray-500',
                  )}
                />
                <span>{tab.label}</span>

                {/* Active indicator - subtle underline glow */}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />
                )}

                {/* Count badges */}
                {tab.id === 'all' && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs tabular-nums',
                      isActive
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-200/60 text-gray-500',
                    )}
                  >
                    {pieces.length}
                  </span>
                )}
                {tab.id === 'collections' && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs tabular-nums',
                      isActive
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-200/60 text-gray-500',
                    )}
                  >
                    {collections.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content with transition */}
      <div
        className={cn(
          'transition-opacity duration-150',
          isTransitioning ? 'opacity-0' : 'opacity-100',
        )}
      >
        {activeTab === 'all' && <AllItemsTab pieces={pieces} />}
        {activeTab === 'website' && (
          <WebsiteTab
            pieces={pieces}
            collections={serializedCollections}
            pieceCollectionsMap={pieceCollectionsMap}
            tenantSlug={tenantSlug}
          />
        )}
        {activeTab === 'collections' && (
          <CollectionsTab collections={collections} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// All Items Tab
// ============================================================================

function AllItemsTab({ pieces }: { pieces: PieceWithExtras[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredPieces = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return pieces
    return pieces.filter(
      (piece) =>
        piece.name.toLowerCase().includes(query) ||
        piece.description?.toLowerCase().includes(query) ||
        piece.category?.toLowerCase().includes(query),
    )
  }, [pieces, search])

  const virtualizer = useVirtualizer({
    count: filteredPieces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(
        checked ? new Set(filteredPieces.map((p) => p.id)) : new Set(),
      )
    },
    [filteredPieces],
  )

  const handleSelectPiece = useCallback((pieceId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(pieceId) : next.delete(pieceId)
      return next
    })
  }, [])

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleActionComplete = useCallback(() => {
    setSelectedIds(new Set())
    router.refresh()
  }, [router])

  const virtualItems = virtualizer.getVirtualItems()
  const shouldVirtualize = filteredPieces.length >= VIRTUALIZATION_THRESHOLD
  const allSelected =
    filteredPieces.length > 0 &&
    filteredPieces.every((p) => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  if (pieces.length === 0) {
    return <EmptyState type="pieces" />
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, or category..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm placeholder-gray-400 shadow-sm transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {search ? (
            <>
              Showing {filteredPieces.length} of {pieces.length} pieces
            </>
          ) : (
            <>{pieces.length} pieces</>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedIds={selectedIds}
          onClearSelection={handleClearSelection}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {shouldVirtualize ? (
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 sticky top-0 z-10">
                <InventoryTableHeader
                  allSelected={allSelected}
                  someSelected={someSelected}
                  onSelectAll={handleSelectAll}
                />
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredPieces.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No pieces found
                    </td>
                  </tr>
                ) : (
                  <>
                    {virtualItems.length > 0 && virtualItems[0].start > 0 && (
                      <tr style={{ height: virtualItems[0].start }}>
                        <td colSpan={11} />
                      </tr>
                    )}
                    {virtualItems.map((virtualRow) => (
                      <InventoryTableRow
                        key={filteredPieces[virtualRow.index].id}
                        piece={filteredPieces[virtualRow.index]}
                        isSelected={selectedIds.has(
                          filteredPieces[virtualRow.index].id,
                        )}
                        onSelect={handleSelectPiece}
                        style={{ height: ROW_HEIGHT }}
                      />
                    ))}
                    {virtualItems.length > 0 && (
                      <tr
                        style={{
                          height:
                            virtualizer.getTotalSize() -
                            (virtualItems[virtualItems.length - 1]?.end || 0),
                        }}
                      >
                        <td colSpan={11} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <InventoryTableHeader
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={handleSelectAll}
              />
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPieces.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No pieces found
                  </td>
                </tr>
              ) : (
                filteredPieces.map((piece) => (
                  <InventoryTableRow
                    key={piece.id}
                    piece={piece}
                    isSelected={selectedIds.has(piece.id)}
                    onSelect={handleSelectPiece}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InventoryTableHeader({
  allSelected,
  someSelected,
  onSelectAll,
}: {
  allSelected: boolean
  someSelected: boolean
  onSelectAll: (checked: boolean) => void
}) {
  return (
    <tr>
      <th className="w-12 px-3 py-3">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) input.indeterminate = someSelected
          }}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </th>
      <th className="w-14 px-2 py-3" />
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Status
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Stock
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Price
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        COGS
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Margin
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Category
      </th>
      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        Created
      </th>
      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
        Actions
      </th>
    </tr>
  )
}

function InventoryTableRow({
  piece,
  isSelected,
  onSelect,
  style,
}: {
  piece: PieceWithExtras
  isSelected: boolean
  onSelect: (pieceId: string, checked: boolean) => void
  style?: React.CSSProperties
}) {
  const cogsCents = piece.calculatedCOGS ?? piece.cogs ?? 0
  const priceCents = piece.price ? piece.price * 100 : 0
  const marginPercent = calculateProfitMargin(priceCents, cogsCents)
  const marginHealth = getMarginHealth(marginPercent)

  const hasLowStockThreshold = piece.lowStockThreshold != null
  const stockValue = piece.stock
  const isOutOfStock = stockValue === 0
  const isLowStock =
    hasLowStockThreshold &&
    stockValue != null &&
    stockValue <= piece.lowStockThreshold! &&
    stockValue > 0

  return (
    <tr
      className={cn(
        'transition-colors',
        isSelected
          ? 'bg-blue-50/60'
          : isOutOfStock
            ? 'bg-red-50/30'
            : isLowStock
              ? 'bg-amber-50/30'
              : marginHealth === 'negative'
                ? 'bg-red-50/40'
                : marginHealth === 'low'
                  ? 'bg-orange-50/40'
                  : 'hover:bg-gray-50/80',
      )}
      style={style}
    >
      <td className="w-12 px-3 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(piece.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="w-14 px-2 py-2">
        <Link href={`/dashboard/inventory/${piece.id}`}>
          {piece.thumbnailUrl ? (
            <img
              src={piece.thumbnailUrl}
              alt={piece.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </Link>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Link href={`/dashboard/inventory/${piece.id}`} className="block group">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              {piece.name}
            </span>
            {isOutOfStock && (
              <span title="Out of stock">
                <Package className="h-4 w-4 text-red-500" />
              </span>
            )}
            {isLowStock && (
              <span title="Low stock">
                <Package className="h-4 w-4 text-amber-500" />
              </span>
            )}
            {marginHealth === 'negative' && (
              <span title="Below cost">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </span>
            )}
            {marginHealth === 'low' && (
              <span title="Low margin">
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </span>
            )}
          </div>
          {piece.description && (
            <p className="text-sm text-gray-500 truncate max-w-xs">
              {piece.description}
            </p>
          )}
        </Link>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <StatusBadge status={piece.status} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <StockBadge stock={stockValue} threshold={piece.lowStockThreshold} />
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {piece.price ? formatCurrency(piece.price, piece.currency) : '-'}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
        {cogsCents > 0 ? formatCurrency(cogsCents / 100, piece.currency) : '-'}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        {marginPercent !== null ? (
          <MarginBadge marginPercent={marginPercent} health={marginHealth} />
        ) : (
          <span className="text-xs text-gray-400">No COGS</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {piece.category}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDate(piece.createdAt)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <DeletePieceButton pieceId={piece.id} pieceName={piece.name} />
      </td>
    </tr>
  )
}

// ============================================================================
// Website Tab
// ============================================================================

function WebsiteTab({
  pieces,
  collections,
  pieceCollectionsMap,
  tenantSlug,
}: {
  pieces: PieceWithExtras[]
  collections: CollectionInfo[]
  pieceCollectionsMap: Record<string, { id: string; name: string }[]>
  tenantSlug: string
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
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
  const [localCollectionsMap, setLocalCollectionsMap] =
    useState(pieceCollectionsMap)

  const filteredPieces = useMemo(() => {
    if (statusFilter === 'all') return pieces
    return pieces.filter((p) => p.status === statusFilter)
  }, [pieces, statusFilter])

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

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === filteredPieces.length
        ? new Set()
        : new Set(filteredPieces.map((p) => p.id)),
    )
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const updateStatus = async (pieceId: string, newStatus: PieceStatus) => {
    const idsToUpdate =
      selectedIds.has(pieceId) && selectedIds.size > 1
        ? Array.from(selectedIds)
        : [pieceId]

    idsToUpdate.forEach((id) => setUpdatingIds((prev) => new Set(prev).add(id)))
    setStatusDropdownOpen(null)

    try {
      if (idsToUpdate.length > 1) {
        const response = await fetch('/api/pieces/bulk-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pieceIds: idsToUpdate, status: newStatus }),
        })
        if (!response.ok) throw new Error('Failed to update')
        setSelectedIds(new Set())
      } else {
        const response = await fetch(`/api/pieces/${pieceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!response.ok) throw new Error('Failed to update')
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

  const toggleFeatured = async (pieceId: string, currentFeatured: boolean) => {
    setTogglingFeatured((prev) => new Set(prev).add(pieceId))
    try {
      const response = await fetch(`/api/pieces/${pieceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      })
      if (!response.ok) throw new Error('Failed to update')
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

  const filteredCollections = useMemo(() => {
    if (!collectionInput.trim()) return collections
    const search = collectionInput.toLowerCase()
    return collections.filter((c) => c.name.toLowerCase().includes(search))
  }, [collections, collectionInput])

  const exactCollectionMatch = collections.find(
    (c) => c.name.toLowerCase() === collectionInput.trim().toLowerCase(),
  )

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
      if (!response.ok) throw new Error('Failed to create collection')
      setCollectionInput('')
      setCollectionsDropdownOpen(null)
      if (idsToUpdate.length > 1) setSelectedIds(new Set())
      router.refresh()
    } catch (err: any) {
      alert(`Failed to create collection: ${err.message}`)
    } finally {
      setCreatingCollection(false)
    }
  }

  const toggleCollection = async (
    pieceId: string,
    collectionId: string,
    isCurrentlyIn: boolean,
  ) => {
    const idsToUpdate =
      selectedIds.has(pieceId) && selectedIds.size > 1
        ? Array.from(selectedIds)
        : [pieceId]

    idsToUpdate.forEach((id) => {
      setUpdatingCollections((prev) =>
        new Set(prev).add(`${id}-${collectionId}`),
      )
    })

    // Optimistic update
    setLocalCollectionsMap((prev) => {
      const updated = { ...prev }
      const collection = collections.find((c) => c.id === collectionId)
      idsToUpdate.forEach((id) => {
        const current = updated[id] || []
        if (isCurrentlyIn) {
          updated[id] = current.filter((c) => c.id !== collectionId)
        } else if (collection && !current.some((c) => c.id === collectionId)) {
          updated[id] = [
            ...current,
            { id: collection.id, name: collection.name },
          ]
        }
      })
      return updated
    })

    try {
      if (idsToUpdate.length > 1 && !isCurrentlyIn) {
        const response = await fetch('/api/pieces/bulk-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pieceIds: idsToUpdate, collectionId }),
        })
        if (!response.ok) {
          setLocalCollectionsMap(pieceCollectionsMap)
          throw new Error('Failed to update')
        }
        setSelectedIds(new Set())
      } else {
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
            throw new Error('Failed to update')
          }
        }
        if (idsToUpdate.length > 1) setSelectedIds(new Set())
      }
      router.refresh()
    } catch (err: any) {
      alert(`Failed to update collections: ${err.message}`)
    } finally {
      idsToUpdate.forEach((id) => {
        setUpdatingCollections((prev) => {
          const next = new Set(prev)
          next.delete(`${id}-${collectionId}`)
          return next
        })
      })
    }
  }

  if (pieces.length === 0) {
    return <EmptyState type="website" />
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={stats.total} />
        <StatCard label="Available" value={stats.available} color="emerald" />
        <StatCard label="Reserved" value={stats.reserved} color="amber" />
        <StatCard label="Sold" value={stats.sold} color="blue" />
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              type="button"
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                statusFilter === filter.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  {stats[filter.value as keyof typeof stats]}
                </span>
              )}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 border border-blue-100">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        <Link
          href={`https://${tenantSlug}.madebuy.com.au`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ExternalLink className="h-4 w-4" />
          View Store
        </Link>
      </div>

      {/* Listings Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
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
              <th className="w-12 px-4 py-3 text-center">
                <Star className="h-4 w-4 mx-auto text-gray-400" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredPieces.map((piece) => {
              const status = statusConfig[piece.status]
              const _StatusIcon = status.icon
              const isUpdating = updatingIds.has(piece.id)
              const isSelected = selectedIds.has(piece.id)

              return (
                <tr
                  key={piece.id}
                  className={cn(
                    'transition-colors',
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
                      {piece.price
                        ? formatCurrency(piece.price, piece.currency)
                        : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <CollectionDropdown
                      pieceId={piece.id}
                      localCollectionsMap={localCollectionsMap}
                      collections={filteredCollections}
                      isOpen={collectionsDropdownOpen === piece.id}
                      onToggle={() =>
                        setCollectionsDropdownOpen(
                          collectionsDropdownOpen === piece.id
                            ? null
                            : piece.id,
                        )
                      }
                      onClose={() => {
                        setCollectionsDropdownOpen(null)
                        setCollectionInput('')
                      }}
                      collectionInput={collectionInput}
                      onInputChange={setCollectionInput}
                      onCreateCollection={(name) =>
                        createCollectionAndAdd(piece.id, name)
                      }
                      onToggleCollection={(collId, isIn) =>
                        toggleCollection(piece.id, collId, isIn)
                      }
                      updatingCollections={updatingCollections}
                      creatingCollection={creatingCollection}
                      exactCollectionMatch={exactCollectionMatch}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(piece.id, piece.isFeatured)}
                      disabled={togglingFeatured.has(piece.id)}
                      className={cn(
                        'transition-colors',
                        togglingFeatured.has(piece.id) && 'opacity-50',
                      )}
                    >
                      {togglingFeatured.has(piece.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : (
                        <Star
                          className={cn(
                            'h-5 w-5',
                            piece.isFeatured
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300 hover:text-amber-400',
                          )}
                        />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown
                      piece={piece}
                      isOpen={statusDropdownOpen === piece.id}
                      onToggle={() =>
                        setStatusDropdownOpen(
                          statusDropdownOpen === piece.id ? null : piece.id,
                        )
                      }
                      onClose={() => setStatusDropdownOpen(null)}
                      onUpdateStatus={(status) =>
                        updateStatus(piece.id, status)
                      }
                      isUpdating={isUpdating}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/inventory/${piece.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Collections Tab
// ============================================================================

function CollectionsTab({ collections }: { collections: Collection[] }) {
  const router = useRouter()
  const [_loading, _setLoading] = useState(false)

  const togglePublished = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState }),
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle collection:', error)
    }
  }

  const toggleFeatured = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentState }),
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle featured:', error)
    }
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return
    try {
      await fetch(`/api/collections/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (error) {
      console.error('Failed to delete collection:', error)
    }
  }

  if (collections.length === 0) {
    return <EmptyState type="collections" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {collections.length} collection{collections.length !== 1 ? 's' : ''}
        </p>
        <Link
          href="/dashboard/collections/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Cover - gradient placeholder */}
            <div className="h-28 bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 flex items-center justify-center">
              <FolderOpen className="h-10 w-10 text-gray-300" />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {collection.pieceIds.length} product
                    {collection.pieceIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {collection.isFeatured && (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  )}
                  {collection.isPublished ? (
                    <Eye className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              {collection.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {collection.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-gray-100">
                <Link
                  href={`/dashboard/collections/${collection.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    togglePublished(collection.id, collection.isPublished)
                  }
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    collection.isPublished
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-gray-400 hover:bg-gray-100',
                  )}
                >
                  {collection.isPublished ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleFeatured(
                      collection.id,
                      collection.isFeatured || false,
                    )
                  }
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    collection.isFeatured
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-gray-400 hover:bg-gray-100',
                  )}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      collection.isFeatured && 'fill-amber-500',
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCollection(collection.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Shared Components
// ============================================================================

function EmptyState({ type }: { type: 'pieces' | 'website' | 'collections' }) {
  const config = {
    pieces: {
      icon: Package,
      title: 'No pieces yet',
      description: 'Add your first piece to start building your inventory.',
      action: { label: 'Add Piece', href: '/dashboard/inventory/new' },
    },
    website: {
      icon: Globe,
      title: 'No products listed',
      description: 'Add products from inventory to list them on your website.',
      action: { label: 'Go to Inventory', href: '/dashboard/inventory' },
    },
    collections: {
      icon: FolderOpen,
      title: 'No collections yet',
      description: 'Create collections to group and showcase your products.',
      action: {
        label: 'Create Collection',
        href: '/dashboard/collections/new',
      },
    },
  }

  const { icon: Icon, title, description, action } = config[type]

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <Link
        href={action.href}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        <Plus className="h-4 w-4" />
        {action.label}
      </Link>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: 'emerald' | 'amber' | 'blue'
}) {
  const colors = {
    emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-700',
    blue: 'border-blue-100 bg-blue-50/50 text-blue-700',
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        color ? colors[color] : 'border-gray-200 bg-white',
      )}
    >
      <p className={cn('text-sm font-medium', color ? '' : 'text-gray-500')}>
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-3xl font-bold tabular-nums',
          color ? '' : 'text-gray-900',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    available: 'bg-emerald-50 text-emerald-700',
    reserved: 'bg-amber-50 text-amber-700',
    sold: 'bg-blue-50 text-blue-700',
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        colors[status] || colors.draft,
      )}
    >
      {status}
    </span>
  )
}

function StockBadge({
  stock,
  threshold,
}: {
  stock?: number
  threshold?: number | null
}) {
  if (stock === undefined || stock === null) {
    return <span className="text-xs text-gray-400">Unlimited</span>
  }

  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        <Package className="h-3 w-3" />
        Out
      </span>
    )
  }

  const hasThreshold = threshold != null && threshold > 0
  const isLow = hasThreshold && stock <= threshold

  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
        <Package className="h-3 w-3" />
        {stock}
      </span>
    )
  }

  return (
    <span className="text-sm text-gray-900">
      {stock}
      {hasThreshold && (
        <span className="ml-1 text-xs text-gray-400">/{threshold}</span>
      )}
    </span>
  )
}

function MarginBadge({
  marginPercent,
  health,
}: {
  marginPercent: number
  health: MarginHealth
}) {
  const styles: Record<MarginHealth, string> = {
    healthy: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-yellow-50 text-yellow-700',
    low: 'bg-orange-50 text-orange-700',
    negative: 'bg-red-50 text-red-700',
    unknown: 'bg-gray-100 text-gray-600',
  }

  const icons: Record<MarginHealth, React.ReactNode> = {
    healthy: <TrendingUp className="h-3 w-3" />,
    warning: <TrendingUp className="h-3 w-3" />,
    low: <TrendingDown className="h-3 w-3" />,
    negative: <AlertTriangle className="h-3 w-3" />,
    unknown: null,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
        styles[health],
      )}
    >
      {icons[health]}
      {marginPercent.toFixed(1)}%
    </span>
  )
}

function StatusDropdown({
  piece,
  isOpen,
  onToggle,
  onClose,
  onUpdateStatus,
  isUpdating,
}: {
  piece: PieceWithExtras
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onUpdateStatus: (status: PieceStatus) => void
  isUpdating: boolean
}) {
  const status = statusConfig[piece.status]
  const StatusIcon = status.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={isUpdating}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
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

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div className="absolute left-0 z-20 mt-1 w-40 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {(['available', 'reserved', 'sold', 'draft'] as PieceStatus[]).map(
              (s) => {
                const cfg = statusConfig[s]
                const Icon = cfg.icon
                const isActive = piece.status === s

                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => onUpdateStatus(s)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? `${cfg.bgColor} ${cfg.color}`
                        : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                    {isActive && <Check className="ml-auto h-4 w-4" />}
                  </button>
                )
              },
            )}
          </div>
        </>
      )}
    </div>
  )
}

function CollectionDropdown({
  pieceId,
  localCollectionsMap,
  collections,
  isOpen,
  onToggle,
  onClose,
  collectionInput,
  onInputChange,
  onCreateCollection,
  onToggleCollection,
  updatingCollections,
  creatingCollection,
  exactCollectionMatch,
}: {
  pieceId: string
  localCollectionsMap: Record<string, { id: string; name: string }[]>
  collections: CollectionInfo[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  collectionInput: string
  onInputChange: (val: string) => void
  onCreateCollection: (name: string) => void
  onToggleCollection: (collId: string, isIn: boolean) => void
  updatingCollections: Set<string>
  creatingCollection: boolean
  exactCollectionMatch: CollectionInfo | undefined
}) {
  const pieceCollections = localCollectionsMap[pieceId] || []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        {pieceCollections.length === 0 ? (
          <span className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
            <FolderOpen className="h-4 w-4" />
            <span className="text-xs">Add</span>
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {pieceCollections.slice(0, 2).map((c) => (
              <span
                key={c.id}
                className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
              >
                {c.name}
              </span>
            ))}
            {pieceCollections.length > 2 && (
              <span className="text-xs text-gray-500">
                +{pieceCollections.length - 2}
              </span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div
            className="absolute left-0 z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="p-2">
              <input
                type="text"
                value={collectionInput}
                onChange={(e) => onInputChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (
                    e.key === 'Enter' &&
                    collectionInput.trim() &&
                    !exactCollectionMatch
                  ) {
                    onCreateCollection(collectionInput)
                  }
                }}
                placeholder="Type collection name..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />

              {collectionInput.trim() && !exactCollectionMatch && (
                <button
                  type="button"
                  onClick={() => onCreateCollection(collectionInput)}
                  disabled={creatingCollection}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  {creatingCollection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create "{collectionInput.trim()}"
                </button>
              )}

              {collections.length > 0 && (
                <>
                  <p className="mt-2 px-1 py-1 text-xs font-semibold text-gray-400 uppercase">
                    {collectionInput.trim() ? 'Matching' : 'Existing'}
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    {collections.map((collection) => {
                      const isIn = pieceCollections.some(
                        (c) => c.id === collection.id,
                      )
                      const isUpdating = updatingCollections.has(
                        `${pieceId}-${collection.id}`,
                      )
                      return (
                        <button
                          type="button"
                          key={collection.id}
                          onClick={() =>
                            onToggleCollection(collection.id, isIn)
                          }
                          disabled={isUpdating}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
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

              {collections.length === 0 && !collectionInput.trim() && (
                <p className="mt-2 px-2 py-2 text-sm text-gray-500">
                  No collections yet. Type to create one.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
