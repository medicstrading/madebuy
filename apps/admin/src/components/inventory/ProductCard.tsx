'use client'

import type { Piece } from '@madebuy/shared'
import { calculateProfitMargin, getMarginHealth } from '@madebuy/shared'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  MoreVertical,
  Package,
  Pencil,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { DeletePieceButton } from './DeletePieceButton'

interface PieceWithExtras extends Piece {
  cogs: number
  thumbnailUrl?: string
}

interface ProductCardProps {
  piece: PieceWithExtras
  isSelected: boolean
  onSelect: (pieceId: string, checked: boolean) => void
}

type MarginHealth = 'healthy' | 'warning' | 'low' | 'negative' | 'unknown'

export function ProductCard({ piece, isSelected, onSelect }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  // Calculate margin values
  const cogsCents = piece.calculatedCOGS ?? piece.cogs ?? 0
  const priceCents = piece.price ? piece.price * 100 : 0
  const marginPercent = calculateProfitMargin(priceCents, cogsCents)
  const marginHealth = getMarginHealth(marginPercent)

  // Stock status
  const hasLowStockThreshold = piece.lowStockThreshold != null
  const stockValue = piece.stock
  const isOutOfStock = stockValue === 0
  const isLowStock =
    hasLowStockThreshold &&
    stockValue != null &&
    stockValue <= piece.lowStockThreshold! &&
    stockValue > 0

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-white shadow-sm transition-all',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : isOutOfStock
            ? 'border-red-200 bg-red-50/30'
            : isLowStock
              ? 'border-amber-200 bg-amber-50/30'
              : marginHealth === 'negative'
                ? 'border-red-200 bg-red-50/40'
                : marginHealth === 'low'
                  ? 'border-orange-200 bg-orange-50/40'
                  : 'border-gray-200 hover:border-gray-300',
      )}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <div className="flex h-11 items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(piece.id, e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label={`Select ${piece.name}`}
          />
        </div>

        {/* Image */}
        <Link
          href={`/dashboard/inventory/${piece.id}`}
          className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100"
        >
          {piece.thumbnailUrl ? (
            <Image
              src={piece.thumbnailUrl}
              alt={piece.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </Link>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/inventory/${piece.id}`}>
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <span className="truncate">{piece.name}</span>
              {isOutOfStock && (
                <Package className="h-4 w-4 flex-shrink-0 text-red-500" />
              )}
              {isLowStock && (
                <Package className="h-4 w-4 flex-shrink-0 text-amber-500" />
              )}
              {marginHealth === 'negative' && (
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
              )}
              {marginHealth === 'low' && (
                <TrendingDown className="h-4 w-4 flex-shrink-0 text-orange-500" />
              )}
            </h3>
          </Link>

          {/* Price and Status */}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {piece.price ? formatCurrency(piece.price, piece.currency) : '-'}
            </span>
            <StatusBadge status={piece.status} />
          </div>

          {/* Stock */}
          <div className="mt-1">
            <StockBadge
              stock={stockValue}
              threshold={piece.lowStockThreshold}
            />
          </div>
        </div>

        {/* Action Menu Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActionMenuOpen(!actionMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 active:bg-gray-100"
            aria-label="More actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {actionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setActionMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setActionMenuOpen(false)
                }}
                role="button"
                tabIndex={0}
                aria-label="Close menu"
              />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg">
                <Link
                  href={`/dashboard/inventory/${piece.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setActionMenuOpen(false)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Product
                </Link>
                <div className="border-t border-gray-100">
                  <DeletePieceButton
                    pieceId={piece.id}
                    pieceName={piece.name}
                    variant="menu-item"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Category</dt>
              <dd className="mt-0.5 text-gray-900">{piece.category || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">COGS</dt>
              <dd className="mt-0.5 text-gray-900">
                {cogsCents > 0
                  ? formatCurrency(cogsCents / 100, piece.currency)
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Margin</dt>
              <dd className="mt-0.5">
                {marginPercent !== null ? (
                  <MarginBadge
                    marginPercent={marginPercent}
                    health={marginHealth}
                  />
                ) : (
                  <span className="text-xs text-gray-400">No COGS</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Created</dt>
              <dd className="mt-0.5 text-gray-900">
                {formatDate(piece.createdAt)}
              </dd>
            </div>
            {piece.description && (
              <div className="col-span-2">
                <dt className="font-medium text-gray-500">Description</dt>
                <dd className="mt-0.5 text-gray-700">{piece.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-center gap-1 border-t border-gray-200 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100"
      >
        {expanded ? 'Show Less' : 'Show More'}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
    </div>
  )
}

// Badge components (reused from table view)
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
    return <span className="text-xs text-gray-400">Unlimited stock</span>
  }

  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        <Package className="h-3 w-3" />
        Out of stock
      </span>
    )
  }

  const hasThreshold = threshold != null && threshold > 0
  const isLow = hasThreshold && stock <= threshold

  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Package className="h-3 w-3" />
        {stock} in stock
      </span>
    )
  }

  return (
    <span className="text-sm text-gray-600">
      {stock} in stock
      {hasThreshold && (
        <span className="ml-1 text-xs text-gray-400">
          (threshold: {threshold})
        </span>
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
