/**
 * ProductionRun - Records when pieces are produced and materials consumed
 */

import type { MaterialUnit } from './material'

export interface ProductionRun {
  id: string
  tenantId: string

  // What was produced
  pieceId: string
  pieceName: string // Snapshot for historical display
  quantityProduced: number

  // Material consumption
  materialsUsed: ProductionMaterialConsumption[]

  // Cost tracking
  totalMaterialCost: number // Sum of all material costs (cents)
  costPerUnit: number // totalMaterialCost / quantityProduced
  currency: string

  // Metadata
  productionDate: Date
  notes?: string

  // Stock impact
  pieceStockBefore: number
  pieceStockAfter: number

  createdAt: Date
}

/**
 * Material consumed in a production run
 */
export interface ProductionMaterialConsumption {
  materialId: string
  materialName: string // Snapshot for historical display
  quantityUsed: number
  unit: MaterialUnit
  costPerUnit: number // Cost at time of production (cents)
  totalCost: number // quantityUsed * costPerUnit

  // Stock impact
  stockBefore: number
  stockAfter: number
}

export interface CreateProductionRunInput {
  pieceId: string
  quantityProduced: number
  productionDate?: Date // Defaults to now
  notes?: string
}

export interface ProductionRunFilters {
  pieceId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ProductionRunListOptions extends ProductionRunFilters {
  limit?: number
  offset?: number
  sortBy?: 'productionDate' | 'createdAt' | 'quantityProduced'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Summary stats for production analytics
 */
export interface ProductionSummary {
  totalRuns: number
  totalQuantityProduced: number
  totalMaterialCost: number
  averageCostPerUnit: number
}
