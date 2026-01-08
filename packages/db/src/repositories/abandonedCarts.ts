import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export interface AbandonedCart {
  id: string
  tenantId: string
  sessionId: string
  customerEmail?: string
  items: CartItem[]
  total: number
  currency: string
  abandonedAt: Date
  recoveryEmailSent: boolean
  recoveryEmailSentAt?: Date
  recovered: boolean
  recoveredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateAbandonedCartInput {
  sessionId: string
  customerEmail?: string
  items: CartItem[]
  total: number
  currency?: string
}

/**
 * Create or update an abandoned cart record
 */
export async function upsertAbandonedCart(
  tenantId: string,
  data: CreateAbandonedCartInput
): Promise<AbandonedCart> {
  const db = await getDatabase()

  const now = new Date()

  // Check if there's already a cart for this session
  const existing = await db.collection('abandoned_carts').findOne({
    tenantId,
    sessionId: data.sessionId,
    recovered: false,
  })

  if (existing) {
    // Update existing cart
    await db.collection('abandoned_carts').updateOne(
      { _id: existing._id },
      {
        $set: {
          items: data.items,
          total: data.total,
          customerEmail: data.customerEmail || existing.customerEmail,
          updatedAt: now,
        },
      }
    )

    return {
      ...(existing as unknown as AbandonedCart),
      items: data.items,
      total: data.total,
      customerEmail: data.customerEmail || existing.customerEmail,
      updatedAt: now,
    }
  }

  // Create new cart
  const cart: AbandonedCart = {
    id: nanoid(),
    tenantId,
    sessionId: data.sessionId,
    customerEmail: data.customerEmail,
    items: data.items,
    total: data.total,
    currency: data.currency || 'AUD',
    abandonedAt: now,
    recoveryEmailSent: false,
    recovered: false,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('abandoned_carts').insertOne(cart)
  return cart
}

/**
 * Get abandoned carts for a tenant
 */
export async function listAbandonedCarts(
  tenantId: string,
  options?: {
    limit?: number
    offset?: number
    recovered?: boolean
    emailSent?: boolean
  }
): Promise<AbandonedCart[]> {
  const db = await getDatabase()

  const query: Record<string, any> = { tenantId }

  if (options?.recovered !== undefined) {
    query.recovered = options.recovered
  }

  if (options?.emailSent !== undefined) {
    query.recoveryEmailSent = options.emailSent
  }

  const carts = await db
    .collection('abandoned_carts')
    .find(query)
    .sort({ abandonedAt: -1 })
    .skip(options?.offset || 0)
    .limit(options?.limit || 50)
    .toArray()

  return carts as unknown as AbandonedCart[]
}

/**
 * Get abandoned cart by session ID
 */
export async function getAbandonedCartBySession(
  tenantId: string,
  sessionId: string
): Promise<AbandonedCart | null> {
  const db = await getDatabase()

  const cart = await db.collection('abandoned_carts').findOne({
    tenantId,
    sessionId,
    recovered: false,
  })

  return cart as AbandonedCart | null
}

/**
 * Mark cart as recovered (completed purchase)
 */
export async function markCartRecovered(
  tenantId: string,
  sessionId: string
): Promise<void> {
  const db = await getDatabase()

  await db.collection('abandoned_carts').updateOne(
    { tenantId, sessionId, recovered: false },
    {
      $set: {
        recovered: true,
        recoveredAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Mark recovery email as sent
 */
export async function markRecoveryEmailSent(
  tenantId: string,
  cartId: string
): Promise<void> {
  const db = await getDatabase()

  await db.collection('abandoned_carts').updateOne(
    { tenantId, id: cartId },
    {
      $set: {
        recoveryEmailSent: true,
        recoveryEmailSentAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Get carts that are ready for recovery email
 * (abandoned for at least 1 hour, email not sent yet)
 */
export async function getCartsForRecoveryEmail(
  tenantId: string,
  minAbandonmentMinutes: number = 60
): Promise<AbandonedCart[]> {
  const db = await getDatabase()

  const cutoff = new Date(Date.now() - minAbandonmentMinutes * 60 * 1000)

  const carts = await db
    .collection('abandoned_carts')
    .find({
      tenantId,
      recovered: false,
      recoveryEmailSent: false,
      abandonedAt: { $lte: cutoff },
      customerEmail: { $exists: true, $nin: [null, ''] },
    })
    .toArray()

  return carts as unknown as AbandonedCart[]
}

/**
 * Count abandoned carts
 */
export async function countAbandonedCarts(
  tenantId: string,
  options?: { recovered?: boolean }
): Promise<number> {
  const db = await getDatabase()

  const query: Record<string, any> = { tenantId }

  if (options?.recovered !== undefined) {
    query.recovered = options.recovered
  }

  return await db.collection('abandoned_carts').countDocuments(query)
}

/**
 * Get abandoned cart statistics
 */
export async function getAbandonedCartStats(tenantId: string): Promise<{
  total: number
  recovered: number
  pending: number
  recoveryRate: number
}> {
  const db = await getDatabase()

  const [total, recovered] = await Promise.all([
    db.collection('abandoned_carts').countDocuments({ tenantId }),
    db.collection('abandoned_carts').countDocuments({ tenantId, recovered: true }),
  ])

  const pending = total - recovered
  const recoveryRate = total > 0 ? Math.round((recovered / total) * 100 * 10) / 10 : 0

  return {
    total,
    recovered,
    pending,
    recoveryRate,
  }
}
