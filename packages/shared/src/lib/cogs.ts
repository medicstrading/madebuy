/**
 * COGS (Cost of Goods Sold) Calculation Utilities
 *
 * Provides functions for calculating product costs, profit margins,
 * and suggested pricing based on material usage.
 */

import type { Material } from '../types/material'
import type { PieceMaterialUsage } from '../types/piece'

/**
 * Material catalog entry for COGS calculation
 * Can be a full Material or a minimal subset with required fields
 */
export interface MaterialCatalogEntry {
  id: string
  costPerUnit: number // Cost in cents per unit
  unit: string
}

/**
 * Result of COGS calculation with detailed breakdown
 */
export interface COGSBreakdown {
  totalCOGS: number // Total cost in cents
  materialCosts: MaterialCostItem[] // Individual material costs
  hasMissingMaterials: boolean // True if any materials weren't found
  missingMaterialIds: string[] // IDs of materials that weren't found
}

/**
 * Individual material cost item in breakdown
 */
export interface MaterialCostItem {
  materialId: string
  materialName?: string
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number // quantity * costPerUnit
}

/**
 * Calculate total COGS from materials used
 *
 * @param materialsUsed - Array of material usages from the piece
 * @param materialsCatalog - Array of materials with their costs (can be Material[] or MaterialCatalogEntry[])
 * @returns Total cost in cents
 *
 * @example
 * const cogs = calculateCOGS(
 *   [{ materialId: 'mat1', quantity: 2, unit: 'piece' }],
 *   [{ id: 'mat1', costPerUnit: 500, unit: 'piece' }]
 * )
 * // Returns 1000 (cents)
 */
export function calculateCOGS(
  materialsUsed: PieceMaterialUsage[] | undefined,
  materialsCatalog: MaterialCatalogEntry[] | Material[],
): number {
  if (!materialsUsed || materialsUsed.length === 0) {
    return 0
  }

  // Create lookup map for O(1) access
  const catalogMap = new Map<string, MaterialCatalogEntry>(
    materialsCatalog.map((m) => [m.id, m]),
  )

  return materialsUsed.reduce((total, usage) => {
    const material = catalogMap.get(usage.materialId)
    if (!material) {
      // Material not found in catalog - skip (logged in breakdown version)
      return total
    }
    return total + material.costPerUnit * usage.quantity
  }, 0)
}

/**
 * Calculate COGS with detailed breakdown of each material cost
 *
 * @param materialsUsed - Array of material usages from the piece
 * @param materialsCatalog - Array of materials with their costs
 * @returns Detailed breakdown including individual costs and missing materials
 */
export function calculateCOGSWithBreakdown(
  materialsUsed: PieceMaterialUsage[] | undefined,
  materialsCatalog: (MaterialCatalogEntry & { name?: string })[] | Material[],
): COGSBreakdown {
  if (!materialsUsed || materialsUsed.length === 0) {
    return {
      totalCOGS: 0,
      materialCosts: [],
      hasMissingMaterials: false,
      missingMaterialIds: [],
    }
  }

  // Create lookup map for O(1) access
  const catalogMap = new Map(materialsCatalog.map((m) => [m.id, m]))

  const materialCosts: MaterialCostItem[] = []
  const missingMaterialIds: string[] = []
  let totalCOGS = 0

  for (const usage of materialsUsed) {
    const material = catalogMap.get(usage.materialId)
    if (!material) {
      missingMaterialIds.push(usage.materialId)
      continue
    }

    const cost = material.costPerUnit * usage.quantity
    totalCOGS += cost

    materialCosts.push({
      materialId: usage.materialId,
      materialName: 'name' in material ? material.name : undefined,
      quantity: usage.quantity,
      unit: usage.unit,
      costPerUnit: material.costPerUnit,
      totalCost: cost,
    })
  }

  return {
    totalCOGS,
    materialCosts,
    hasMissingMaterials: missingMaterialIds.length > 0,
    missingMaterialIds,
  }
}

/**
 * Calculate profit margin as a percentage
 *
 * @param price - Selling price in cents
 * @param cogs - Cost of goods sold in cents
 * @returns Profit margin as percentage (0-100), or null if invalid
 *
 * @example
 * calculateProfitMargin(10000, 3000) // Returns 70 (70% margin)
 * calculateProfitMargin(10000, 10000) // Returns 0 (break-even)
 * calculateProfitMargin(10000, 12000) // Returns -20 (20% loss)
 */
export function calculateProfitMargin(
  price: number | undefined,
  cogs: number | undefined,
): number | null {
  // Need valid positive price to calculate margin
  if (!price || price <= 0) {
    return null
  }

  // COGS of 0 or undefined means no costs tracked yet
  if (cogs === undefined || cogs === null) {
    return null
  }

  // Margin = (Price - COGS) / Price * 100
  const margin = ((price - cogs) / price) * 100
  return Math.round(margin * 10) / 10 // Round to 1 decimal place
}

/**
 * Calculate gross profit amount
 *
 * @param price - Selling price in cents
 * @param cogs - Cost of goods sold in cents
 * @returns Gross profit in cents, or null if invalid
 */
export function calculateGrossProfit(
  price: number | undefined,
  cogs: number | undefined,
): number | null {
  if (!price || price <= 0) {
    return null
  }
  if (cogs === undefined || cogs === null) {
    return null
  }
  return price - cogs
}

/**
 * Suggest a selling price based on target profit margin
 *
 * @param cogs - Cost of goods sold in cents
 * @param targetMarginPercent - Desired profit margin percentage (e.g., 50 for 50%)
 * @returns Suggested price in cents, or null if invalid
 *
 * @example
 * suggestPrice(3000, 50) // Returns 6000 (50% margin = price is 2x COGS)
 * suggestPrice(3000, 70) // Returns 10000 (70% margin)
 */
export function suggestPrice(
  cogs: number | undefined,
  targetMarginPercent: number,
): number | null {
  if (!cogs || cogs <= 0) {
    return null
  }

  // Validate margin is less than 100% (mathematically impossible otherwise)
  if (targetMarginPercent >= 100 || targetMarginPercent < 0) {
    return null
  }

  // Price = COGS / (1 - margin)
  // For 50% margin: Price = COGS / 0.5 = COGS * 2
  // For 70% margin: Price = COGS / 0.3 = COGS * 3.33
  const price = cogs / (1 - targetMarginPercent / 100)

  // Round up to nearest dollar (100 cents)
  return Math.ceil(price / 100) * 100
}

/**
 * Get margin health status based on percentage
 *
 * @param margin - Profit margin percentage
 * @returns Health status: 'healthy' (>=50%), 'warning' (30-50%), 'low' (0-30%), 'negative' (<0%)
 */
export function getMarginHealth(
  margin: number | null,
): 'healthy' | 'warning' | 'low' | 'negative' | 'unknown' {
  if (margin === null) {
    return 'unknown'
  }
  if (margin >= 50) {
    return 'healthy'
  }
  if (margin >= 30) {
    return 'warning'
  }
  if (margin >= 0) {
    return 'low'
  }
  return 'negative'
}

/**
 * Common target margins for different business strategies
 */
export const TARGET_MARGINS = {
  /** Break-even - cover costs only */
  BREAK_EVEN: 0,
  /** Budget/volume pricing */
  BUDGET: 30,
  /** Standard retail margin */
  STANDARD: 50,
  /** Premium/luxury margin */
  PREMIUM: 60,
  /** High-end artisan/custom work */
  ARTISAN: 70,
  /** Very high margin for unique pieces */
  EXCLUSIVE: 80,
} as const

/**
 * Format COGS as currency string (for display)
 *
 * @param cogs - Amount in cents
 * @param currency - Currency code (default: 'AUD')
 * @returns Formatted currency string
 */
export function formatCOGS(cogs: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cogs / 100)
}
