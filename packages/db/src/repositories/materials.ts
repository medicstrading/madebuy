import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Material, MaterialUsage, CreateMaterialInput } from '@madebuy/shared'

export async function createMaterial(tenantId: string, data: CreateMaterialInput): Promise<Material> {
  const db = await getDatabase()

  const isLowStock = data.quantityInStock <= data.reorderPoint

  const material: Material = {
    id: nanoid(),
    tenantId,
    name: data.name,
    category: data.category,
    quantityInStock: data.quantityInStock,
    unit: data.unit,
    reorderPoint: data.reorderPoint,
    isLowStock,
    costPerUnit: data.costPerUnit,
    currency: data.currency || 'AUD',
    supplier: data.supplier,
    supplierSku: data.supplierSku,
    notes: data.notes,
    tags: data.tags || [],
    invoiceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('materials').insertOne(material)
  return material
}

export async function getMaterial(tenantId: string, id: string): Promise<Material | null> {
  const db = await getDatabase()
  return await db.collection('materials').findOne({ tenantId, id }) as Material | null
}

export async function listMaterials(
  tenantId: string,
  filters?: { category?: string; isLowStock?: boolean }
): Promise<Material[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.category) {
    query.category = filters.category
  }

  if (filters?.isLowStock !== undefined) {
    query.isLowStock = filters.isLowStock
  }

  const results = await db.collection('materials')
    .find(query)
    .sort({ name: 1 })
    .toArray()

  return results as any[]
}

export async function updateMaterial(
  tenantId: string,
  id: string,
  updates: Partial<Omit<Material, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()

  // Recalculate isLowStock if quantity or reorder point changed
  if (updates.quantityInStock !== undefined || updates.reorderPoint !== undefined) {
    const current = await getMaterial(tenantId, id)
    if (current) {
      const newQuantity = updates.quantityInStock ?? current.quantityInStock
      const newReorderPoint = updates.reorderPoint ?? current.reorderPoint
      updates.isLowStock = newQuantity <= newReorderPoint
    }
  }

  await db.collection('materials').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deleteMaterial(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('materials').deleteOne({ tenantId, id })
}

// Material Usage tracking

export async function recordMaterialUsage(
  tenantId: string,
  pieceId: string,
  materialId: string,
  quantityUsed: number
): Promise<MaterialUsage> {
  const db = await getDatabase()

  // Get current material to snapshot cost
  const material = await getMaterial(tenantId, materialId)
  if (!material) {
    throw new Error(`Material ${materialId} not found`)
  }

  const costAtTime = material.costPerUnit
  const totalCost = costAtTime * quantityUsed

  const usage: MaterialUsage = {
    id: nanoid(),
    tenantId,
    pieceId,
    materialId,
    quantityUsed,
    costAtTime,
    totalCost,
    createdAt: new Date(),
  }

  await db.collection('material_usages').insertOne(usage)

  // Update material stock
  await db.collection('materials').updateOne(
    { tenantId, id: materialId },
    {
      $inc: { quantityInStock: -quantityUsed },
      $set: { updatedAt: new Date() }
    }
  )

  // Recalculate isLowStock
  const updatedMaterial = await getMaterial(tenantId, materialId)
  if (updatedMaterial) {
    const isLowStock = updatedMaterial.quantityInStock <= updatedMaterial.reorderPoint
    await db.collection('materials').updateOne(
      { tenantId, id: materialId },
      { $set: { isLowStock } }
    )
  }

  return usage
}

export async function getMaterialUsageForPiece(tenantId: string, pieceId: string): Promise<MaterialUsage[]> {
  const db = await getDatabase()
  const results = await db.collection('material_usages')
    .find({ tenantId, pieceId })
    .toArray()

  return results as any[]
}

export async function calculatePieceCOGS(tenantId: string, pieceId: string): Promise<number> {
  const usages = await getMaterialUsageForPiece(tenantId, pieceId)
  return usages.reduce((total, usage) => total + usage.totalCost, 0)
}

/**
 * Batch calculate COGS for multiple pieces in a single query
 * Use this instead of calling calculatePieceCOGS in a loop to avoid N+1 queries
 */
export async function calculateBatchCOGS(
  tenantId: string,
  pieceIds: string[]
): Promise<Map<string, number>> {
  if (pieceIds.length === 0) return new Map()

  const db = await getDatabase()
  const results = await db.collection('material_usages')
    .aggregate([
      { $match: { tenantId, pieceId: { $in: pieceIds } } },
      { $group: { _id: '$pieceId', total: { $sum: '$totalCost' } } }
    ])
    .toArray()

  return new Map(results.map(r => [r._id as string, r.total || 0]))
}

/**
 * Update material stock from invoice
 * Used when confirming invoice scan results
 */
export async function restockMaterialFromInvoice(
  tenantId: string,
  materialId: string,
  invoiceId: string,
  quantityAdded: number,
  costPerUnit?: number
): Promise<void> {
  const db = await getDatabase()

  const updateData: any = {
    $inc: { quantityInStock: quantityAdded },
    $addToSet: { invoiceIds: invoiceId },
    $set: {
      lastRestocked: new Date(),
      updatedAt: new Date()
    }
  }

  // Update cost per unit if provided
  if (costPerUnit !== undefined) {
    updateData.$set.costPerUnit = costPerUnit
  }

  await db.collection('materials').updateOne(
    { tenantId, id: materialId },
    updateData
  )

  // Recalculate isLowStock
  const material = await getMaterial(tenantId, materialId)
  if (material) {
    const isLowStock = material.quantityInStock <= material.reorderPoint
    await db.collection('materials').updateOne(
      { tenantId, id: materialId },
      { $set: { isLowStock } }
    )
  }
}
