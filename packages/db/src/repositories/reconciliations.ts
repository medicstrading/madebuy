import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  InventoryReconciliation,
  ReconciliationItem,
  ReconciliationStatus,
  CreateReconciliationInput,
  AddReconciliationItemInput,
  UpdateReconciliationItemInput,
  ReconciliationFilters,
  ReconciliationListOptions,
  Material,
  Piece,
} from '@madebuy/shared'
import * as materials from './materials'
import * as pieces from './pieces'

export interface ReconciliationListResult {
  reconciliations: InventoryReconciliation[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Create a new reconciliation session
 */
export async function createReconciliation(
  tenantId: string,
  input?: CreateReconciliationInput
): Promise<InventoryReconciliation> {
  const db = await getDatabase()

  const reconciliation: InventoryReconciliation = {
    id: nanoid(),
    tenantId,
    status: 'in_progress',
    reconciliationDate: input?.reconciliationDate || new Date(),
    items: [],
    totalItemsCounted: 0,
    totalDiscrepancies: 0,
    totalAdjustmentValue: 0,
    notes: input?.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('inventory_reconciliations').insertOne(reconciliation)
  return reconciliation
}

/**
 * Get a reconciliation by ID
 */
export async function getReconciliation(
  tenantId: string,
  id: string
): Promise<InventoryReconciliation | null> {
  const db = await getDatabase()
  return await db.collection('inventory_reconciliations').findOne({ tenantId, id }) as InventoryReconciliation | null
}

/**
 * List reconciliations with filtering and pagination
 */
export async function listReconciliations(
  tenantId: string,
  options?: ReconciliationListOptions
): Promise<ReconciliationListResult> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (options?.status) {
    query.status = options.status
  }

  if (options?.dateFrom || options?.dateTo) {
    query.reconciliationDate = {}
    if (options.dateFrom) {
      (query.reconciliationDate as Record<string, unknown>).$gte = options.dateFrom
    }
    if (options.dateTo) {
      (query.reconciliationDate as Record<string, unknown>).$lte = options.dateTo
    }
  }

  if (options?.hasDiscrepancies) {
    query.totalDiscrepancies = { $gt: 0 }
  }

  // Pagination defaults
  const limit = Math.min(options?.limit || 20, 100)
  const skip = options?.offset || 0
  const page = Math.max(1, Math.floor(skip / limit) + 1)

  // Get total count
  const total = await db.collection('inventory_reconciliations').countDocuments(query)

  // Get paginated results
  const results = await db.collection('inventory_reconciliations')
    .find(query)
    .sort({ reconciliationDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  return {
    reconciliations: results as unknown as InventoryReconciliation[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Add an item to a reconciliation session
 */
export async function addItem(
  tenantId: string,
  reconciliationId: string,
  input: AddReconciliationItemInput
): Promise<ReconciliationItem> {
  const db = await getDatabase()

  // Get the reconciliation
  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) {
    throw new Error(`Reconciliation ${reconciliationId} not found`)
  }

  if (reconciliation.status !== 'in_progress') {
    throw new Error('Cannot add items to a completed or cancelled reconciliation')
  }

  // Check if item already exists
  const existingItem = reconciliation.items.find(
    i => i.itemType === input.itemType && i.itemId === input.itemId
  )
  if (existingItem) {
    throw new Error('Item already added to this reconciliation')
  }

  // Get the current stock for the item
  let itemName: string
  let expectedQuantity: number
  let unit: string | undefined
  let costPerUnit: number | undefined

  if (input.itemType === 'material') {
    const material = await materials.getMaterial(tenantId, input.itemId)
    if (!material) {
      throw new Error(`Material ${input.itemId} not found`)
    }
    itemName = material.name
    expectedQuantity = material.quantityInStock
    unit = material.unit
    costPerUnit = material.costPerUnit
  } else {
    const piece = await pieces.getPiece(tenantId, input.itemId)
    if (!piece) {
      throw new Error(`Piece ${input.itemId} not found`)
    }
    itemName = piece.name
    expectedQuantity = piece.stock ?? 0
  }

  const item: ReconciliationItem = {
    id: nanoid(),
    itemType: input.itemType,
    itemId: input.itemId,
    itemName,
    unit,
    expectedQuantity,
    actualQuantity: expectedQuantity, // Default to expected (no discrepancy)
    discrepancy: 0,
    costPerUnit,
    totalAdjustmentValue: 0,
  }

  // Add to reconciliation
  await db.collection('inventory_reconciliations').updateOne(
    { tenantId, id: reconciliationId },
    {
      $push: { items: item } as any,
      $inc: { totalItemsCounted: 1 },
      $set: { updatedAt: new Date() },
    }
  )

  return item
}

/**
 * Add multiple materials to reconciliation at once
 */
export async function addAllMaterials(
  tenantId: string,
  reconciliationId: string
): Promise<number> {
  const db = await getDatabase()

  // Get all materials
  const result = await materials.listMaterials(tenantId, {}, { limit: 500 })

  let addedCount = 0
  for (const material of result.materials) {
    try {
      await addItem(tenantId, reconciliationId, {
        itemType: 'material',
        itemId: material.id,
      })
      addedCount++
    } catch {
      // Skip if already added
    }
  }

  return addedCount
}

/**
 * Update the actual quantity for an item in reconciliation
 */
export async function updateItem(
  tenantId: string,
  reconciliationId: string,
  itemId: string,
  input: UpdateReconciliationItemInput
): Promise<void> {
  const db = await getDatabase()

  // Get the reconciliation
  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) {
    throw new Error(`Reconciliation ${reconciliationId} not found`)
  }

  if (reconciliation.status !== 'in_progress') {
    throw new Error('Cannot update items in a completed or cancelled reconciliation')
  }

  // Find the item
  const itemIndex = reconciliation.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) {
    throw new Error(`Item ${itemId} not found in reconciliation`)
  }

  const item = reconciliation.items[itemIndex]

  // Calculate discrepancy
  const discrepancy = input.actualQuantity - item.expectedQuantity
  const totalAdjustmentValue = item.costPerUnit
    ? discrepancy * item.costPerUnit
    : 0

  // Update the item
  await db.collection('inventory_reconciliations').updateOne(
    { tenantId, id: reconciliationId },
    {
      $set: {
        [`items.${itemIndex}.actualQuantity`]: input.actualQuantity,
        [`items.${itemIndex}.discrepancy`]: discrepancy,
        [`items.${itemIndex}.totalAdjustmentValue`]: totalAdjustmentValue,
        [`items.${itemIndex}.adjustmentReason`]: input.adjustmentReason,
        [`items.${itemIndex}.notes`]: input.notes,
        [`items.${itemIndex}.countedAt`]: new Date(),
        updatedAt: new Date(),
      },
    }
  )

  // Recalculate totals
  await recalculateTotals(tenantId, reconciliationId)
}

/**
 * Recalculate reconciliation totals
 */
async function recalculateTotals(
  tenantId: string,
  reconciliationId: string
): Promise<void> {
  const db = await getDatabase()

  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) return

  let totalDiscrepancies = 0
  let totalAdjustmentValue = 0

  for (const item of reconciliation.items) {
    if (item.discrepancy !== 0) {
      totalDiscrepancies++
      totalAdjustmentValue += item.totalAdjustmentValue || 0
    }
  }

  await db.collection('inventory_reconciliations').updateOne(
    { tenantId, id: reconciliationId },
    {
      $set: {
        totalDiscrepancies,
        totalAdjustmentValue,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Complete a reconciliation and apply all stock adjustments
 */
export async function completeReconciliation(
  tenantId: string,
  reconciliationId: string
): Promise<void> {
  const db = await getDatabase()

  // Get the reconciliation
  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) {
    throw new Error(`Reconciliation ${reconciliationId} not found`)
  }

  if (reconciliation.status !== 'in_progress') {
    throw new Error('Reconciliation is not in progress')
  }

  // Apply stock adjustments for items with discrepancies
  for (const item of reconciliation.items) {
    if (item.discrepancy === 0) continue

    if (item.itemType === 'material') {
      // Adjust material stock
      await materials.adjustStock(
        tenantId,
        item.itemId,
        item.discrepancy,
        'reconciliation'
      )
    } else {
      // Set piece stock to actual quantity
      await pieces.updatePiece(tenantId, item.itemId, {
        stock: item.actualQuantity,
      })
    }
  }

  // Mark as completed
  await db.collection('inventory_reconciliations').updateOne(
    { tenantId, id: reconciliationId },
    {
      $set: {
        status: 'completed' as ReconciliationStatus,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Cancel a reconciliation without applying changes
 */
export async function cancelReconciliation(
  tenantId: string,
  reconciliationId: string
): Promise<void> {
  const db = await getDatabase()

  // Get the reconciliation
  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) {
    throw new Error(`Reconciliation ${reconciliationId} not found`)
  }

  if (reconciliation.status !== 'in_progress') {
    throw new Error('Reconciliation is not in progress')
  }

  // Mark as cancelled
  await db.collection('inventory_reconciliations').updateOne(
    { tenantId, id: reconciliationId },
    {
      $set: {
        status: 'cancelled' as ReconciliationStatus,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Delete a reconciliation (only if cancelled or in progress)
 */
export async function deleteReconciliation(
  tenantId: string,
  reconciliationId: string
): Promise<void> {
  const db = await getDatabase()

  const reconciliation = await getReconciliation(tenantId, reconciliationId)
  if (!reconciliation) {
    throw new Error(`Reconciliation ${reconciliationId} not found`)
  }

  if (reconciliation.status === 'completed') {
    throw new Error('Cannot delete a completed reconciliation')
  }

  await db.collection('inventory_reconciliations').deleteOne({ tenantId, id: reconciliationId })
}

/**
 * Get the most recent in-progress reconciliation (if any)
 */
export async function getActiveReconciliation(
  tenantId: string
): Promise<InventoryReconciliation | null> {
  const db = await getDatabase()

  return await db.collection('inventory_reconciliations').findOne({
    tenantId,
    status: 'in_progress',
  }) as InventoryReconciliation | null
}
