import type {
  CreateProductionRunInput,
  Material,
  ProductionMaterialConsumption,
  ProductionRun,
  ProductionRunListOptions,
  ProductionSummary,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import * as materials from './materials'
import * as pieces from './pieces'

export interface ProductionRunListResult {
  runs: ProductionRun[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Create a production run - logs piece production and decrements material stock
 */
export async function createProductionRun(
  tenantId: string,
  input: CreateProductionRunInput,
): Promise<ProductionRun> {
  const db = await getDatabase()

  // Get the piece to verify it exists and get its materials recipe
  const piece = await pieces.getPiece(tenantId, input.pieceId)
  if (!piece) {
    throw new Error(`Piece ${input.pieceId} not found`)
  }

  if (!piece.materialsUsed || piece.materialsUsed.length === 0) {
    throw new Error(
      `Piece "${piece.name}" has no materials configured. Add materials to the piece first.`,
    )
  }

  // Get all materials in one query
  const materialIds = piece.materialsUsed.map((m) => m.materialId)
  const materialsList = (await db
    .collection('materials')
    .find({ tenantId, id: { $in: materialIds } })
    .toArray()) as unknown as Material[]

  const materialsMap = new Map(materialsList.map((m) => [m.id, m]))

  // Calculate material consumption and check stock availability
  const materialsConsumption: ProductionMaterialConsumption[] = []
  const insufficientStock: string[] = []

  for (const usage of piece.materialsUsed) {
    const material = materialsMap.get(usage.materialId)
    if (!material) {
      throw new Error(`Material ${usage.materialId} not found`)
    }

    const quantityNeeded = usage.quantity * input.quantityProduced
    if (material.quantityInStock < quantityNeeded) {
      insufficientStock.push(
        `${material.name}: need ${quantityNeeded} ${material.unit}, have ${material.quantityInStock}`,
      )
    }

    materialsConsumption.push({
      materialId: material.id,
      materialName: material.name,
      quantityUsed: quantityNeeded,
      unit: material.unit,
      costPerUnit: material.costPerUnit,
      totalCost: material.costPerUnit * quantityNeeded,
      stockBefore: material.quantityInStock,
      stockAfter: material.quantityInStock - quantityNeeded,
    })
  }

  if (insufficientStock.length > 0) {
    throw new Error(`Insufficient materials:\n${insufficientStock.join('\n')}`)
  }

  // Calculate totals
  const totalMaterialCost = materialsConsumption.reduce(
    (sum, m) => sum + m.totalCost,
    0,
  )
  const costPerUnit = Math.round(totalMaterialCost / input.quantityProduced)

  // Get current piece stock
  const pieceStockBefore = piece.stock ?? 0

  // Create the production run record
  const productionRun: ProductionRun = {
    id: nanoid(),
    tenantId,
    pieceId: piece.id,
    pieceName: piece.name,
    quantityProduced: input.quantityProduced,
    materialsUsed: materialsConsumption,
    totalMaterialCost,
    costPerUnit,
    currency: piece.currency || 'AUD',
    productionDate: input.productionDate || new Date(),
    notes: input.notes,
    pieceStockBefore,
    pieceStockAfter: pieceStockBefore + input.quantityProduced,
    createdAt: new Date(),
  }

  // Start a session for atomic operations
  // Note: For simplicity, we're doing sequential updates. In production,
  // consider using MongoDB transactions for true atomicity.

  // 1. Insert the production run
  await db.collection('production_runs').insertOne(productionRun)

  // 2. Decrement material stock for each material used
  for (const consumption of materialsConsumption) {
    await materials.adjustStock(
      tenantId,
      consumption.materialId,
      -consumption.quantityUsed,
      'production',
    )
  }

  // 3. Increment piece stock
  await pieces.incrementStock(tenantId, piece.id, input.quantityProduced)

  return productionRun
}

/**
 * Get a single production run by ID
 */
export async function getProductionRun(
  tenantId: string,
  id: string,
): Promise<ProductionRun | null> {
  const db = await getDatabase()
  return (await db
    .collection('production_runs')
    .findOne({ tenantId, id })) as ProductionRun | null
}

/**
 * List production runs with filtering and pagination
 */
export async function listProductionRuns(
  tenantId: string,
  options?: ProductionRunListOptions,
): Promise<ProductionRunListResult> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (options?.pieceId) {
    query.pieceId = options.pieceId
  }

  if (options?.dateFrom || options?.dateTo) {
    query.productionDate = {}
    if (options.dateFrom) {
      ;(query.productionDate as Record<string, unknown>).$gte = options.dateFrom
    }
    if (options.dateTo) {
      ;(query.productionDate as Record<string, unknown>).$lte = options.dateTo
    }
  }

  // Pagination defaults
  const page = Math.max(
    1,
    Math.floor((options?.offset || 0) / (options?.limit || 20)) + 1,
  )
  const limit = Math.min(options?.limit || 20, 100)
  const skip = options?.offset || 0

  // Sorting
  const sortBy = options?.sortBy || 'productionDate'
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder }

  // Get total count
  const total = await db.collection('production_runs').countDocuments(query)

  // Get paginated results
  const results = await db
    .collection('production_runs')
    .find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray()

  return {
    runs: results as unknown as ProductionRun[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Get production runs for a specific piece
 */
export async function getProductionRunsForPiece(
  tenantId: string,
  pieceId: string,
  limit: number = 10,
): Promise<ProductionRun[]> {
  const db = await getDatabase()

  const results = await db
    .collection('production_runs')
    .find({ tenantId, pieceId })
    .sort({ productionDate: -1 })
    .limit(limit)
    .toArray()

  return results as unknown as ProductionRun[]
}

/**
 * Delete a production run and reverse the stock changes
 * Use with caution - this reverses all stock adjustments
 */
export async function deleteProductionRun(
  tenantId: string,
  id: string,
): Promise<void> {
  const db = await getDatabase()

  // Get the production run
  const productionRun = await getProductionRun(tenantId, id)
  if (!productionRun) {
    throw new Error(`Production run ${id} not found`)
  }

  // Reverse material stock changes (add back what was consumed)
  for (const consumption of productionRun.materialsUsed) {
    await materials.adjustStock(
      tenantId,
      consumption.materialId,
      consumption.quantityUsed, // Add back (positive)
      'production_reversal',
    )
  }

  // Reverse piece stock change (subtract what was added)
  await pieces.decrementStock(
    tenantId,
    productionRun.pieceId,
    productionRun.quantityProduced,
  )

  // Delete the production run record
  await db.collection('production_runs').deleteOne({ tenantId, id })
}

/**
 * Get production summary statistics for a date range
 */
export async function getProductionSummary(
  tenantId: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<ProductionSummary> {
  const db = await getDatabase()

  const match: Record<string, unknown> = { tenantId }
  if (dateFrom || dateTo) {
    match.productionDate = {}
    if (dateFrom)
      (match.productionDate as Record<string, unknown>).$gte = dateFrom
    if (dateTo) (match.productionDate as Record<string, unknown>).$lte = dateTo
  }

  const results = await db
    .collection('production_runs')
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalQuantityProduced: { $sum: '$quantityProduced' },
          totalMaterialCost: { $sum: '$totalMaterialCost' },
        },
      },
    ])
    .toArray()

  if (results.length === 0) {
    return {
      totalRuns: 0,
      totalQuantityProduced: 0,
      totalMaterialCost: 0,
      averageCostPerUnit: 0,
    }
  }

  const data = results[0]
  return {
    totalRuns: data.totalRuns,
    totalQuantityProduced: data.totalQuantityProduced,
    totalMaterialCost: data.totalMaterialCost,
    averageCostPerUnit:
      data.totalQuantityProduced > 0
        ? Math.round(data.totalMaterialCost / data.totalQuantityProduced)
        : 0,
  }
}
