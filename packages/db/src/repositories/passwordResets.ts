import { getDatabase } from '../client'

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
  expiryMinutes = 60
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
export async function getPasswordResetByToken(token: string): Promise<PasswordReset | null> {
  const db = await getDatabase()
  return (await db.collection('password_resets').findOne({ token })) as PasswordReset | null
}

/**
 * Validate and consume a password reset token
 * Returns the tenant ID if valid, null if invalid/expired
 */
export async function validateAndConsumeToken(token: string): Promise<string | null> {
  const db = await getDatabase()

  const reset = await getPasswordResetByToken(token)

  if (!reset) {
    return null
  }

  // Check if already used
  if (reset.used) {
    return null
  }

  // Check if expired
  if (new Date() > reset.expiresAt) {
    return null
  }

  // Mark as used
  await db.collection('password_resets').updateOne({ token }, { $set: { used: true } })

  return reset.tenantId
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
