import type {
  CreateDiscountCodeInput,
  DiscountCode,
  DiscountListOptions,
  DiscountStats,
  DiscountValidationResult,
  UpdateDiscountCodeInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/** Escape special regex characters to prevent ReDoS attacks */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============ Per-Customer Usage Tracking ============

interface DiscountUsage {
  tenantId: string
  discountId: string
  customerEmail: string
  usageCount: number
  lastUsedAt: Date
}

async function getCustomerUsage(
  tenantId: string,
  discountId: string,
  customerEmail: string,
): Promise<number> {
  const db = await getDatabase()
  const usage = (await db.collection('discount_usage').findOne({
    tenantId,
    discountId,
    customerEmail: customerEmail.toLowerCase(),
  })) as DiscountUsage | null

  return usage?.usageCount ?? 0
}

async function incrementCustomerUsage(
  tenantId: string,
  discountId: string,
  customerEmail: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('discount_usage').updateOne(
    {
      tenantId,
      discountId,
      customerEmail: customerEmail.toLowerCase(),
    },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
      $setOnInsert: {
        tenantId,
        discountId,
        customerEmail: customerEmail.toLowerCase(),
      },
    },
    { upsert: true },
  )
}

// ============ CRUD Operations ============

export async function createDiscountCode(
  tenantId: string,
  input: CreateDiscountCodeInput,
): Promise<DiscountCode> {
  const db = await getDatabase()

  // Normalize code to uppercase
  const code = input.code.toUpperCase().trim()

  // Check for duplicate code within tenant
  const existing = await db
    .collection('discount_codes')
    .findOne({ tenantId, code })
  if (existing) {
    throw new Error(`Discount code "${code}" already exists`)
  }

  const now = new Date()
  const discount: DiscountCode = {
    id: nanoid(),
    tenantId,
    code,
    description: input.description,
    type: input.type,
    value: input.value,
    minOrderAmount: input.minOrderAmount,
    maxDiscountAmount: input.maxDiscountAmount,
    maxUses: input.maxUses,
    maxUsesPerCustomer: input.maxUsesPerCustomer,
    applicablePieceIds: input.applicablePieceIds || [],
    applicableCategories: input.applicableCategories || [],
    excludedPieceIds: input.excludedPieceIds || [],
    startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    isActive: input.isActive ?? true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('discount_codes').insertOne(discount)
  return discount
}

export async function getDiscountCodeById(
  tenantId: string,
  id: string,
): Promise<DiscountCode | null> {
  const db = await getDatabase()
  const doc = await db.collection('discount_codes').findOne({ tenantId, id })
  return doc as unknown as DiscountCode | null
}

export async function getDiscountCodeByCode(
  tenantId: string,
  code: string,
): Promise<DiscountCode | null> {
  const db = await getDatabase()
  const normalizedCode = code.toUpperCase().trim()
  const doc = await db
    .collection('discount_codes')
    .findOne({ tenantId, code: normalizedCode })
  return doc as unknown as DiscountCode | null
}

export async function updateDiscountCode(
  tenantId: string,
  id: string,
  input: UpdateDiscountCodeInput,
): Promise<DiscountCode | null> {
  const db = await getDatabase()

  const updateDoc: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  }

  // Normalize code if provided
  if (input.code) {
    const newCode = input.code.toUpperCase().trim()

    // Check for duplicate if code is changing
    const existing = await db.collection('discount_codes').findOne({
      tenantId,
      code: newCode,
      id: { $ne: id },
    })
    if (existing) {
      throw new Error(`Discount code "${newCode}" already exists`)
    }

    updateDoc.code = newCode
  }

  // Convert dates
  if (input.startsAt) {
    updateDoc.startsAt = new Date(input.startsAt)
  }
  if (input.expiresAt) {
    updateDoc.expiresAt = new Date(input.expiresAt)
  }

  const result = await db
    .collection('discount_codes')
    .findOneAndUpdate(
      { tenantId, id },
      { $set: updateDoc },
      { returnDocument: 'after' },
    )

  return result as unknown as DiscountCode | null
}

export async function deleteDiscountCode(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db
    .collection('discount_codes')
    .deleteOne({ tenantId, id })
  return result.deletedCount === 1
}

// ============ List & Query ============

export async function listDiscountCodes(
  tenantId: string,
  options: DiscountListOptions = {},
): Promise<{ items: DiscountCode[]; total: number; hasMore: boolean }> {
  const db = await getDatabase()

  const {
    limit = 20,
    offset = 0,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options

  const query: Record<string, unknown> = { tenantId }

  if (isActive !== undefined) {
    query.isActive = isActive
  }

  if (search) {
    const escapedSearch = escapeRegex(search)
    query.$or = [
      { code: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ]
  }

  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === 'asc' ? 1 : -1,
  }

  const [items, total] = await Promise.all([
    db
      .collection('discount_codes')
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection('discount_codes').countDocuments(query),
  ])

  return {
    items: items as unknown as DiscountCode[],
    total,
    hasMore: offset + items.length < total,
  }
}

// ============ Validation ============

export async function validateDiscountCode(
  tenantId: string,
  code: string,
  orderTotal: number,
  pieceIds: string[],
  customerEmail?: string,
): Promise<DiscountValidationResult> {
  const discount = await getDiscountCodeByCode(tenantId, code)

  if (!discount) {
    return { valid: false, error: 'Invalid discount code' }
  }

  // Check if active
  if (!discount.isActive) {
    return { valid: false, error: 'This discount code is no longer active' }
  }

  // Check date validity
  const now = new Date()
  if (discount.startsAt && new Date(discount.startsAt) > now) {
    return { valid: false, error: 'This discount code is not yet active' }
  }
  if (discount.expiresAt && new Date(discount.expiresAt) < now) {
    return { valid: false, error: 'This discount code has expired' }
  }

  // Check usage limits
  if (discount.maxUses && discount.usageCount >= discount.maxUses) {
    return {
      valid: false,
      error: 'This discount code has reached its usage limit',
    }
  }

  // Check per-customer usage limit
  if (discount.maxUsesPerCustomer && customerEmail) {
    const customerUsage = await getCustomerUsage(
      tenantId,
      discount.id,
      customerEmail,
    )
    if (customerUsage >= discount.maxUsesPerCustomer) {
      return {
        valid: false,
        error: 'You have reached the maximum uses for this discount code',
      }
    }
  }

  // Check minimum order amount
  if (discount.minOrderAmount && orderTotal < discount.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order amount of $${discount.minOrderAmount.toFixed(2)} required`,
    }
  }

  // Check applicable pieces/categories
  if (discount.applicablePieceIds && discount.applicablePieceIds.length > 0) {
    const hasApplicablePiece = pieceIds.some((id) =>
      discount.applicablePieceIds?.includes(id),
    )
    if (!hasApplicablePiece) {
      return {
        valid: false,
        error: 'This discount code is not valid for these items',
      }
    }
  }

  // Check excluded pieces
  if (discount.excludedPieceIds && discount.excludedPieceIds.length > 0) {
    const allExcluded = pieceIds.every((id) =>
      discount.excludedPieceIds?.includes(id),
    )
    if (allExcluded) {
      return {
        valid: false,
        error: 'This discount code is not valid for these items',
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0

  switch (discount.type) {
    case 'percentage':
      discountAmount = orderTotal * (discount.value / 100)
      // Apply max discount cap if set
      if (
        discount.maxDiscountAmount &&
        discountAmount > discount.maxDiscountAmount
      ) {
        discountAmount = discount.maxDiscountAmount
      }
      break

    case 'fixed':
      discountAmount = Math.min(discount.value, orderTotal)
      break

    case 'free_shipping':
      // Discount amount will be shipping cost, handled at checkout
      discountAmount = 0
      break
  }

  // PAY-15: Clamp discount to prevent negative order totals
  const finalDiscountAmount = Math.min(discountAmount, orderTotal)

  return {
    valid: true,
    discount,
    discountAmount: Math.round(finalDiscountAmount * 100) / 100,
  }
}

// ============ Usage Tracking ============

export async function incrementDiscountUsage(
  tenantId: string,
  id: string,
  customerEmail?: string,
): Promise<void> {
  const db = await getDatabase()

  // Increment global usage
  await db.collection('discount_codes').updateOne(
    { tenantId, id },
    {
      $inc: { usageCount: 1 },
      $set: { updatedAt: new Date() },
    },
  )

  // Track per-customer usage if email provided
  if (customerEmail) {
    await incrementCustomerUsage(tenantId, id, customerEmail)
  }
}

// ============ Stats ============

export async function getDiscountStats(
  tenantId: string,
): Promise<DiscountStats> {
  const db = await getDatabase()
  const now = new Date()

  const [totalCodes, activeCodes, expiredCodes, usageAgg, topCodes] =
    await Promise.all([
      db.collection('discount_codes').countDocuments({ tenantId }),
      db.collection('discount_codes').countDocuments({
        tenantId,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      }),
      db.collection('discount_codes').countDocuments({
        tenantId,
        $or: [{ isActive: false }, { expiresAt: { $lt: now } }],
      }),
      db
        .collection('discount_codes')
        .aggregate([
          { $match: { tenantId } },
          { $group: { _id: null, total: { $sum: '$usageCount' } } },
        ])
        .toArray(),
      db
        .collection('discount_codes')
        .find({ tenantId, usageCount: { $gt: 0 } })
        .sort({ usageCount: -1 })
        .limit(5)
        .project({ code: 1, usageCount: 1, type: 1, value: 1 })
        .toArray(),
    ])

  return {
    totalCodes,
    activeCodes,
    expiredCodes,
    totalUsage: usageAgg[0]?.total || 0,
    topCodes: topCodes.map((c: any) => ({
      code: c.code,
      usageCount: c.usageCount,
      type: c.type,
      value: c.value,
    })),
  }
}

// ============ Count ============

export async function countDiscountCodes(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return db.collection('discount_codes').countDocuments({ tenantId })
}
