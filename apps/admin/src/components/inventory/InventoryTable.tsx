'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertTriangle, TrendingUp, TrendingDown, Search, X, Package } from 'lucide-react'
import Link from 'next/link'
import { DeletePieceButton } from './DeletePieceButton'
import type { Piece } from '@madebuy/shared'
import { getMarginHealth, calculateProfitMargin } from '@madebuy/shared'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PieceWithCOGS extends Piece {
  cogs: number
}

interface InventoryTableProps {
  pieces: PieceWithCOGS[]
}

// Virtualization threshold - only virtualize when we have many items
const VIRTUALIZATION_THRESHOLD = 50
const ROW_HEIGHT = 72 // Estimated row height

type MarginHealth = 'healthy' | 'warning' | 'low' | 'negative' | 'unknown'

/**
 * InventoryTable - Virtualized table for large inventory lists
 *
 * Features:
 * - Search/filter functionality
 * - Virtualized rows for performance with 100+ items
 * - Fixed header during scroll
 * - Margin health indicators
 */
export function InventoryTable({ pieces }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)

  // Filter pieces based on search
  const filteredPieces = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return pieces

    return pieces.filter(piece =>
      piece.name.toLowerCase().includes(query) ||
      (piece.description?.toLowerCase().includes(query)) ||
      (piece.category?.toLowerCase().includes(query))
    )
  }, [pieces, search])

  // Virtualizer for table rows
  const virtualizer = useVirtualizer({
    count: filteredPieces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleClearSearch = useCallback(() => {
    setSearch('')
  }, [])

  const virtualItems = virtualizer.getVirtualItems()
  const shouldVirtualize = filteredPieces.length >= VIRTUALIZATION_THRESHOLD

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, description, or category..."
          maxLength={200}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {search && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {search ? (
          <>
            Showing {filteredPieces.length} of {pieces.length} pieces
            {filteredPieces.length === 0 && (
              <span className="ml-1">
                - <button onClick={handleClearSearch} className="text-blue-600 hover:underline">Clear search</button>
              </span>
            )}
          </>
        ) : (
          <>Showing all {pieces.length} pieces</>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        {shouldVirtualize ? (
          // Virtualized table for large lists
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <TableHeader />
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredPieces.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No pieces found
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Top spacer */}
                    {virtualItems.length > 0 && virtualItems[0].start > 0 && (
                      <tr style={{ height: virtualItems[0].start }} aria-hidden="true">
                        <td colSpan={9} />
                      </tr>
                    )}
                    {/* Virtual rows */}
                    {virtualItems.map((virtualRow) => {
                      const piece = filteredPieces[virtualRow.index]
                      return (
                        <InventoryRow
                          key={piece.id}
                          piece={piece}
                          style={{ height: ROW_HEIGHT }}
                        />
                      )
                    })}
                    {/* Bottom spacer */}
                    {virtualItems.length > 0 && (
                      <tr
                        style={{
                          height: virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0),
                        }}
                        aria-hidden="true"
                      >
                        <td colSpan={9} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // Non-virtualized table for small lists
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <TableHeader />
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPieces.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No pieces found
                  </td>
                </tr>
              ) : (
                filteredPieces.map((piece) => (
                  <InventoryRow key={piece.id} piece={piece} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function TableHeader() {
  return (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Status
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Stock
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Price
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        COGS
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Margin
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Category
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        Created
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
        Actions
      </th>
    </tr>
  )
}

interface InventoryRowProps {
  piece: PieceWithCOGS
  style?: React.CSSProperties
}

function InventoryRow({ piece, style }: InventoryRowProps) {
  // Calculate margin values
  const cogsCents = piece.calculatedCOGS ?? piece.cogs ?? 0
  const priceCents = piece.price ? piece.price * 100 : 0
  const margin = priceCents > 0 && cogsCents > 0 ? priceCents - cogsCents : null
  const marginPercent = calculateProfitMargin(priceCents, cogsCents)
  const marginHealth = getMarginHealth(marginPercent)

  // Low stock check
  const hasLowStockThreshold = piece.lowStockThreshold !== undefined && piece.lowStockThreshold !== null
  const stockValue = piece.stock
  const isOutOfStock = stockValue === 0
  const isLowStock = hasLowStockThreshold && stockValue !== undefined && stockValue <= piece.lowStockThreshold! && stockValue > 0

  return (
    <tr
      className={`hover:bg-gray-50 ${
        isOutOfStock ? 'bg-red-50/30' :
        isLowStock ? 'bg-amber-50/30' :
        marginHealth === 'low' ? 'bg-orange-50/50' :
        marginHealth === 'negative' ? 'bg-red-50/50' : ''
      }`}
      style={style}
    >
      <td className="whitespace-nowrap px-6 py-4">
        <Link href={`/dashboard/inventory/${piece.id}`} className="block">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-900 hover:text-blue-600">{piece.name}</div>
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
              <span title="Selling below cost">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </span>
            )}
            {marginHealth === 'low' && (
              <span title="Low profit margin">
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </span>
            )}
          </div>
          {piece.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">{piece.description}</div>
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
      <td className="whitespace-nowrap px-6 py-4 text-sm">
        {marginPercent !== null && margin !== null ? (
          <div className="flex items-center gap-1">
            <MarginBadge marginPercent={marginPercent} health={marginHealth} />
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No COGS</span>
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

function StockBadge({ stock, threshold }: { stock?: number; threshold?: number | null }) {
  // Unlimited stock
  if (stock === undefined || stock === null) {
    return <span className="text-gray-400 text-xs">Unlimited</span>
  }

  // Out of stock
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
        <Package className="h-3 w-3" />
        Out
      </span>
    )
  }

  // Check if below threshold
  const hasThreshold = threshold !== undefined && threshold !== null && threshold > 0
  const isLow = hasThreshold && stock <= threshold

  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800" title={`Threshold: ${threshold}`}>
        <Package className="h-3 w-3" />
        {stock}
      </span>
    )
  }

  // Normal stock
  return (
    <span className="text-sm text-gray-900">
      {stock}
      {hasThreshold && <span className="text-gray-400 text-xs ml-1">/{threshold}</span>}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.draft}`}>
      {status}
    </span>
  )
}

function MarginBadge({ marginPercent, health }: { marginPercent: number; health: MarginHealth }) {
  const styles: Record<MarginHealth, string> = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    low: 'bg-orange-100 text-orange-800',
    negative: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  }

  const icons: Record<MarginHealth, React.ReactNode> = {
    healthy: <TrendingUp className="h-3 w-3" />,
    warning: <TrendingUp className="h-3 w-3" />,
    low: <TrendingDown className="h-3 w-3" />,
    negative: <AlertTriangle className="h-3 w-3" />,
    unknown: null,
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${styles[health]}`}>
      {icons[health]}
      {marginPercent.toFixed(1)}%
    </span>
  )
}
