import { getDatabase } from '../client'

/**
 * Ensure indexes exist for password_resets collection
 * Should be called on app startup
 */
export async function ensurePasswordResetIndexes(): Promise<void> {
  const db = await getDatabase()
  const collection = db.collection('password_resets')

  // Index on token for fast lookups
  await collection.createIndex({ token: 1 }, { unique: true })

  // Index on expiresAt for cleanup queries
  await collection.createIndex({ expiresAt: 1 })

  // Compound index for validateAndConsumeToken query
  await collection.createIndex({ token: 1, used: 1, expiresAt: 1 })
}

export interface PasswordReset {
  token: string
  email: string
  tenantId: string
  expiresAt: Date
  createdAt: Date
  used: boolean
}

/**
 * Create a password reset token for a tenant
 */
export async function createPasswordResetToken(
  email: string,
  tenantId: string,
  token: string,
  expiryMinutes = 60,
): Promise<PasswordReset> {
  const db = await getDatabase()

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  const resetRecord: PasswordReset = {
    token,
    email: email.toLowerCase(),
    tenantId,
    expiresAt,
    createdAt: new Date(),
    used: false,
  }

  await db.collection('password_resets').insertOne(resetRecord)
  return resetRecord
}

/**
 * Get password reset by token
 */
export async function getPasswordResetByToken(
  token: string,
): Promise<PasswordReset | null> {
  const db = await getDatabase()
  return (await db
    .collection('password_resets')
    .findOne({ token })) as PasswordReset | null
}

/**
 * Validate and consume a password reset token (atomic operation)
 * Returns the tenant ID if valid, null if invalid/expired
 * Uses findOneAndUpdate for atomic check-and-consume to prevent race conditions
 */
export async function validateAndConsumeToken(
  token: string,
): Promise<string | null> {
  const db = await getDatabase()

  // Atomic find and update to prevent race conditions
  // Only matches if token exists, is not used, and is not expired
  const result = await db.collection('password_resets').findOneAndUpdate(
    {
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
    { returnDocument: 'before' },
  )

  if (!result) {
    return null
  }

  return (result as unknown as PasswordReset).tenantId
}

/**
 * Delete expired password reset tokens (cleanup cron)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection('password_resets').deleteMany({
    expiresAt: { $lt: new Date() },
  })
  return result.deletedCount
}

/**
 * Delete all password reset tokens for a tenant
 */
export async function deleteTokensForTenant(tenantId: string): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection('password_resets').deleteMany({ tenantId })
  return result.deletedCount
}
