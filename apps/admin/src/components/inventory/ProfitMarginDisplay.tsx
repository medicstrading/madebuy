'use client'

import { useMemo } from 'react'
import type { Piece, Material, PieceMaterialUsage } from '@madebuy/shared'
import {
  calculateCOGS,
  calculateCOGSWithBreakdown,
  calculateProfitMargin,
  suggestPrice,
  getMarginHealth,
  TARGET_MARGINS,
  type COGSBreakdown,
} from '@madebuy/shared'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  DollarSign,
  Lightbulb,
} from 'lucide-react'

interface ProfitMarginDisplayProps {
  piece: Piece
  materials: Material[]
  /** Optional: show expanded breakdown by default */
  expanded?: boolean
  /** Optional: callback when price suggestion is applied */
  onPriceSuggestionApply?: (suggestedPrice: number) => void
}

/**
 * ProfitMarginDisplay - Shows comprehensive cost and profit breakdown for a piece
 *
 * Displays:
 * - Material costs breakdown (each material with quantity and cost)
 * - Total COGS
 * - Selling price
 * - Gross profit
 * - Profit margin percentage with health indicator
 * - Suggested pricing options
 */
export function ProfitMarginDisplay({
  piece,
  materials,
  expanded = false,
  onPriceSuggestionApply,
}: ProfitMarginDisplayProps) {
  // Calculate COGS breakdown
  const cogsBreakdown = useMemo((): COGSBreakdown => {
    if (!piece.materialsUsed || piece.materialsUsed.length === 0) {
      return {
        totalCOGS: piece.calculatedCOGS || piece.cogs || 0,
        materialCosts: [],
        hasMissingMaterials: false,
        missingMaterialIds: [],
      }
    }
    return calculateCOGSWithBreakdown(piece.materialsUsed, materials)
  }, [piece.materialsUsed, piece.calculatedCOGS, piece.cogs, materials])

  // Price in cents (piece.price is in dollars)
  const priceCents = piece.price ? piece.price * 100 : 0
  const cogsCents = cogsBreakdown.totalCOGS

  // Calculate margin
  const profitMargin = useMemo(() => {
    return calculateProfitMargin(priceCents, cogsCents)
  }, [priceCents, cogsCents])

  const marginHealth = getMarginHealth(profitMargin)

  // Gross profit
  const grossProfit = priceCents > 0 && cogsCents > 0 ? priceCents - cogsCents : null

  // Suggested prices for different margins
  const suggestedPrices = useMemo(() => {
    if (cogsCents <= 0) return null
    return {
      budget: suggestPrice(cogsCents, TARGET_MARGINS.BUDGET),
      standard: suggestPrice(cogsCents, TARGET_MARGINS.STANDARD),
      premium: suggestPrice(cogsCents, TARGET_MARGINS.PREMIUM),
      artisan: suggestPrice(cogsCents, TARGET_MARGINS.ARTISAN),
    }
  }, [cogsCents])

  // Health indicator styles
  const healthStyles = {
    healthy: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      label: 'Healthy',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      icon: <TrendingUp className="h-5 w-5 text-yellow-600" />,
      label: 'Moderate',
    },
    low: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      icon: <TrendingDown className="h-5 w-5 text-orange-600" />,
      label: 'Low',
    },
    negative: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      label: 'Loss',
    },
    unknown: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-900',
      icon: <Calculator className="h-5 w-5 text-gray-600" />,
      label: 'Unknown',
    },
  }

  const currentStyle = healthStyles[marginHealth]

  // No COGS data
  if (cogsCents <= 0 && (!piece.materialsUsed || piece.materialsUsed.length === 0)) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-gray-600">
          <Calculator className="h-6 w-6" />
          <div>
            <p className="font-medium">No COGS Data</p>
            <p className="text-sm">Add materials to this piece to track costs and calculate profit margins.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Profit Margin Overview */}
      <div className={`rounded-lg ${currentStyle.bg} ${currentStyle.border} border p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStyle.icon}
            <div>
              <h3 className={`text-lg font-semibold ${currentStyle.text}`}>
                Profit Margin: {profitMargin !== null ? `${profitMargin.toFixed(1)}%` : 'N/A'}
              </h3>
              <p className="text-sm text-gray-600">
                {marginHealth === 'healthy' && 'Great margin - sustainable pricing'}
                {marginHealth === 'warning' && 'Moderate margin - room for improvement'}
                {marginHealth === 'low' && 'Low margin - consider raising price'}
                {marginHealth === 'negative' && 'Selling below cost - price increase needed'}
                {marginHealth === 'unknown' && 'Set price and materials to calculate'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {grossProfit !== null ? `$${(grossProfit / 100).toFixed(2)}` : '-'}
            </p>
            <p className="text-xs text-gray-500">gross profit per unit</p>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Cost Breakdown
        </h3>

        {/* Material Costs */}
        {cogsBreakdown.materialCosts.length > 0 && (
          <div className="space-y-2 mb-4">
            {cogsBreakdown.materialCosts.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  {item.materialName || `Material #${index + 1}`}
                  <span className="text-gray-400 ml-2">
                    ({item.quantity} {item.unit} @ ${(item.costPerUnit / 100).toFixed(2)})
                  </span>
                </div>
                <div className="font-medium text-gray-900">
                  ${(item.totalCost / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Missing materials warning */}
        {cogsBreakdown.hasMissingMaterials && (
          <div className="mb-4 rounded bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Some materials not found in catalog. COGS may be incomplete.</span>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total COGS</span>
            <span className="font-semibold text-gray-900">
              ${(cogsCents / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Selling Price</span>
            <span className="font-semibold text-gray-900">
              {piece.price ? `$${piece.price.toFixed(2)}` : 'Not set'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="font-medium text-gray-900">Gross Profit</span>
            <span className={`font-bold ${grossProfit !== null && grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {grossProfit !== null ? `$${(grossProfit / 100).toFixed(2)}` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Price Suggestions */}
      {suggestedPrices && (
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-6">
          <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggested Pricing
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PriceSuggestion
              label="Budget (30%)"
              price={suggestedPrices.budget}
              currentPrice={priceCents}
              onClick={onPriceSuggestionApply}
            />
            <PriceSuggestion
              label="Standard (50%)"
              price={suggestedPrices.standard}
              currentPrice={priceCents}
              onClick={onPriceSuggestionApply}
              recommended
            />
            <PriceSuggestion
              label="Premium (60%)"
              price={suggestedPrices.premium}
              currentPrice={priceCents}
              onClick={onPriceSuggestionApply}
            />
            <PriceSuggestion
              label="Artisan (70%)"
              price={suggestedPrices.artisan}
              currentPrice={priceCents}
              onClick={onPriceSuggestionApply}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface PriceSuggestionProps {
  label: string
  price: number | null
  currentPrice: number
  recommended?: boolean
  onClick?: (price: number) => void
}

function PriceSuggestion({ label, price, currentPrice, recommended, onClick }: PriceSuggestionProps) {
  if (!price) return null

  const priceInDollars = price / 100
  const isCurrentPrice = Math.abs(currentPrice - price) < 100 // Within $1

  return (
    <div className={`rounded-lg p-3 ${recommended ? 'bg-purple-100 border border-purple-300' : 'bg-white border border-purple-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-purple-800">{label}</span>
        {recommended && (
          <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">Recommended</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-purple-900">
          ${priceInDollars.toFixed(2)}
        </span>
        {onClick && !isCurrentPrice && (
          <button
            onClick={() => onClick(priceInDollars)}
            className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            Apply
          </button>
        )}
        {isCurrentPrice && (
          <span className="text-xs text-purple-600 font-medium">Current</span>
        )}
      </div>
    </div>
  )
}

/**
 * Compact version for lists/cards
 */
export function ProfitMarginBadge({ piece }: { piece: Piece }) {
  const cogsCents = piece.calculatedCOGS || piece.cogs || 0
  const priceCents = piece.price ? piece.price * 100 : 0
  const margin = calculateProfitMargin(priceCents, cogsCents)
  const health = getMarginHealth(margin)

  if (margin === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
        No COGS
      </span>
    )
  }

  const styles = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    low: 'bg-orange-100 text-orange-800',
    negative: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  }

  const icons = {
    healthy: <TrendingUp className="h-3 w-3" />,
    warning: <TrendingUp className="h-3 w-3" />,
    low: <TrendingDown className="h-3 w-3" />,
    negative: <AlertTriangle className="h-3 w-3" />,
    unknown: null,
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${styles[health]}`}>
      {icons[health]}
      {margin.toFixed(1)}%
    </span>
  )
}
