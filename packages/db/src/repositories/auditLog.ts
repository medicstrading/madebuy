import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/**
 * Audit Log Types
 * Track security-relevant events for compliance and debugging
 */
export type AuditEventType =
  // Authentication events
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.token.refresh'
  | 'auth.session.expired'
  // Customer authentication
  | 'customer.login.success'
  | 'customer.login.failed'
  | 'customer.register'
  | 'customer.email.verify'
  | 'customer.password.reset.request'
  | 'customer.password.reset.complete'
  | 'customer.password.change'
  | 'customer.email.change'
  // Security events
  | 'security.rate.limit.exceeded'
  | 'security.suspicious.activity'
  | 'security.token.invalid'
  // Admin actions
  | 'admin.tenant.update'
  | 'admin.settings.change'

export interface AuditLogEntry {
  id: string
  tenantId?: string
  eventType: AuditEventType
  actorId?: string // User/customer ID who performed the action
  actorEmail?: string
  actorType: 'tenant' | 'customer' | 'system' | 'anonymous'
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  success: boolean
  errorMessage?: string
  createdAt: Date
}

export interface CreateAuditLogInput {
  tenantId?: string
  eventType: AuditEventType
  actorId?: string
  actorEmail?: string
  actorType: 'tenant' | 'customer' | 'system' | 'anonymous'
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  success: boolean
  errorMessage?: string
}

/**
 * Log an audit event
 */
export async function logAuditEvent(input: CreateAuditLogInput): Promise<void> {
  try {
    const db = await getDatabase()

    const entry: AuditLogEntry = {
      id: nanoid(),
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorType: input.actorType,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata,
      success: input.success,
      errorMessage: input.errorMessage,
      createdAt: new Date(),
    }

    await db.collection('audit_logs').insertOne(entry)
  } catch (error) {
    // Never fail the main operation due to audit logging
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Get audit logs for a tenant
 */
export async function getAuditLogs(
  tenantId: string,
  options?: {
    eventTypes?: AuditEventType[]
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }
): Promise<AuditLogEntry[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (options?.eventTypes?.length) {
    query.eventType = { $in: options.eventTypes }
  }

  if (options?.startDate || options?.endDate) {
    query.createdAt = {}
    if (options.startDate) {
      (query.createdAt as Record<string, Date>).$gte = options.startDate
    }
    if (options.endDate) {
      (query.createdAt as Record<string, Date>).$lte = options.endDate
    }
  }

  const cursor = db.collection('audit_logs')
    .find(query)
    .sort({ createdAt: -1 })

  if (options?.offset) {
    cursor.skip(options.offset)
  }

  if (options?.limit) {
    cursor.limit(options.limit)
  } else {
    cursor.limit(100) // Default limit
  }

  return (await cursor.toArray()) as unknown as AuditLogEntry[]
}

/**
 * Get failed login attempts for an IP or email
 * Useful for detecting brute force attacks
 */
export async function getFailedLoginAttempts(
  options: {
    ip?: string
    email?: string
    tenantId?: string
    withinMinutes?: number
  }
): Promise<number> {
  const db = await getDatabase()

  const cutoff = new Date()
  cutoff.setMinutes(cutoff.getMinutes() - (options.withinMinutes || 15))

  const query: Record<string, unknown> = {
    eventType: { $in: ['auth.login.failed', 'customer.login.failed'] },
    success: false,
    createdAt: { $gte: cutoff },
  }

  if (options.ip) {
    query.ip = options.ip
  }
  if (options.email) {
    query.actorEmail = options.email
  }
  if (options.tenantId) {
    query.tenantId = options.tenantId
  }

  return await db.collection('audit_logs').countDocuments(query)
}

/**
 * Clean up old audit logs (retention policy)
 * Should be called from a scheduled job
 */
export async function purgeOldAuditLogs(olderThanDays: number = 90): Promise<number> {
  const db = await getDatabase()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const result = await db.collection('audit_logs').deleteMany({
    createdAt: { $lt: cutoff },
  })

  return result.deletedCount
}
