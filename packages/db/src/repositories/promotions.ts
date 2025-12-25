import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Promotion, CreatePromotionInput } from '@madebuy/shared'

export async function createPromotion(tenantId: string, data: CreatePromotionInput): Promise<Promotion> {
  const db = await getDatabase()

  const promotion: Promotion = {
    id: nanoid(),
    tenantId,
    name: data.name,
    code: data.code,
    type: data.type,
    value: data.value,
    minPurchaseAmount: data.minPurchaseAmount,
    maxUses: data.maxUses,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: data.isActive ?? true,
    timesUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('promotions').insertOne(promotion)
  return promotion
}

export async function getPromotion(tenantId: string, id: string): Promise<Promotion | null> {
  const db = await getDatabase()
  return await db.collection('promotions').findOne({ tenantId, id }) as Promotion | null
}

export async function getPromotionByCode(tenantId: string, code: string): Promise<Promotion | null> {
  const db = await getDatabase()
  return await db.collection('promotions').findOne({ tenantId, code }) as Promotion | null
}

export async function listPromotions(
  tenantId: string,
  filters?: { isActive?: boolean }
): Promise<Promotion[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive
  }

  const results = await db.collection('promotions')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function validatePromotion(
  tenantId: string,
  code: string,
  orderTotal: number
): Promise<{ valid: boolean; promotion?: Promotion; error?: string }> {
  const promotion = await getPromotionByCode(tenantId, code)

  if (!promotion) {
    return { valid: false, error: 'Promotion code not found' }
  }

  if (!promotion.isActive) {
    return { valid: false, error: 'Promotion is not active' }
  }

  const now = new Date()
  if (now < promotion.startDate) {
    return { valid: false, error: 'Promotion has not started yet' }
  }

  if (promotion.endDate && now > promotion.endDate) {
    return { valid: false, error: 'Promotion has expired' }
  }

  if (promotion.maxUses && promotion.timesUsed >= promotion.maxUses) {
    return { valid: false, error: 'Promotion has reached maximum uses' }
  }

  if (promotion.minPurchaseAmount && orderTotal < promotion.minPurchaseAmount) {
    return {
      valid: false,
      error: `Minimum purchase amount of ${promotion.minPurchaseAmount} required`
    }
  }

  return { valid: true, promotion }
}

export async function calculateDiscount(promotion: Promotion, orderTotal: number): Promise<number> {
  switch (promotion.type) {
    case 'percentage':
      return (orderTotal * promotion.value) / 100
    case 'fixed_amount':
      return Math.min(promotion.value, orderTotal)
    case 'free_shipping':
      return 0 // Shipping discount handled separately
    default:
      return 0
  }
}

export async function incrementPromotionUsage(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('promotions').updateOne(
    { tenantId, id },
    {
      $inc: { timesUsed: 1 },
      $set: { updatedAt: new Date() }
    }
  )
}

export async function updatePromotion(
  tenantId: string,
  id: string,
  updates: Partial<Omit<Promotion, 'id' | 'tenantId' | 'timesUsed' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()
  await db.collection('promotions').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deletePromotion(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('promotions').deleteOne({ tenantId, id })
}
