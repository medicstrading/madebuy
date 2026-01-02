import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  AccountingConnection,
  AccountingProvider,
  CreateAccountingConnectionInput,
  UpdateAccountingConnectionInput,
  SyncStatus,
} from '@madebuy/shared'

const COLLECTION = 'accounting_connections'

/**
 * Get an accounting connection for a tenant and provider
 * CRITICAL: tenantId required for multi-tenant isolation
 */
export async function getConnection(
  tenantId: string,
  provider: AccountingProvider
): Promise<AccountingConnection | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    provider,
  })
  return result as unknown as AccountingConnection | null
}

/**
 * Get an accounting connection by ID
 * CRITICAL: tenantId required for multi-tenant isolation
 */
export async function getConnectionById(
  tenantId: string,
  connectionId: string
): Promise<AccountingConnection | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({
    tenantId,
    id: connectionId,
  })
  return result as unknown as AccountingConnection | null
}

/**
 * Create a new accounting connection
 * CRITICAL: tenantId is required for multi-tenant isolation
 */
export async function createConnection(
  tenantId: string,
  input: CreateAccountingConnectionInput
): Promise<AccountingConnection> {
  const db = await getDatabase()

  // Check for existing connection
  const existing = await getConnection(tenantId, input.provider)
  if (existing) {
    throw new Error(`Connection to ${input.provider} already exists for this tenant`)
  }

  const connection: AccountingConnection = {
    id: nanoid(),
    tenantId,
    provider: input.provider,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    externalTenantId: input.externalTenantId,
    externalTenantName: input.externalTenantName,
    accountMappings: input.accountMappings,
    status: 'connected',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(connection)
  return connection
}

/**
 * Update an existing accounting connection
 * CRITICAL: Always filter by tenantId for security
 */
export async function updateConnection(
  tenantId: string,
  provider: AccountingProvider,
  input: UpdateAccountingConnectionInput
): Promise<AccountingConnection | null> {
  const db = await getDatabase()

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.accessToken !== undefined) {
    updateData.accessToken = input.accessToken
  }
  if (input.refreshToken !== undefined) {
    updateData.refreshToken = input.refreshToken
  }
  if (input.tokenExpiresAt !== undefined) {
    updateData.tokenExpiresAt = input.tokenExpiresAt
  }
  if (input.externalTenantName !== undefined) {
    updateData.externalTenantName = input.externalTenantName
  }
  if (input.status !== undefined) {
    updateData.status = input.status
  }
  if (input.accountMappings !== undefined) {
    // Merge account mappings
    const existing = await getConnection(tenantId, provider)
    if (existing) {
      updateData.accountMappings = {
        ...existing.accountMappings,
        ...input.accountMappings,
      }
    }
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, provider },
    { $set: updateData },
    { returnDocument: 'after' }
  )

  return result as unknown as AccountingConnection | null
}

/**
 * Update OAuth tokens (typically after token refresh)
 * CRITICAL: Always filter by tenantId for security
 */
export async function updateTokens(
  tenantId: string,
  provider: AccountingProvider,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date
): Promise<AccountingConnection | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, provider },
    {
      $set: {
        accessToken,
        refreshToken,
        tokenExpiresAt,
        status: 'connected',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as AccountingConnection | null
}

/**
 * Update sync status after a sync attempt
 * CRITICAL: Always filter by tenantId for security
 */
export async function updateSyncStatus(
  tenantId: string,
  provider: AccountingProvider,
  status: SyncStatus,
  error?: string
): Promise<AccountingConnection | null> {
  const db = await getDatabase()

  const updateData: Record<string, unknown> = {
    lastSyncAt: new Date(),
    lastSyncStatus: status,
    updatedAt: new Date(),
  }

  if (error) {
    updateData.lastSyncError = error
  } else {
    // Clear previous error on success
    updateData.lastSyncError = null
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, provider },
    {
      $set: updateData,
      ...(error ? {} : { $unset: { lastSyncError: '' } }),
    },
    { returnDocument: 'after' }
  )

  return result as unknown as AccountingConnection | null
}

/**
 * Mark connection as needing re-authentication
 * Called when tokens are invalid or expired
 */
export async function markNeedsReauth(
  tenantId: string,
  provider: AccountingProvider,
  error?: string
): Promise<AccountingConnection | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, provider },
    {
      $set: {
        status: 'needs_reauth',
        lastSyncError: error || 'Token expired or invalid',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as AccountingConnection | null
}

/**
 * Delete an accounting connection
 * CRITICAL: Always filter by tenantId for security
 */
export async function deleteConnection(
  tenantId: string,
  provider: AccountingProvider
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).deleteOne({
    tenantId,
    provider,
  })
  return result.deletedCount === 1
}

/**
 * List all accounting connections for a tenant
 * CRITICAL: Always filter by tenantId for security
 */
export async function listConnections(
  tenantId: string
): Promise<AccountingConnection[]> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as AccountingConnection[]
}

/**
 * Find connections that need token refresh
 * Used by background job to proactively refresh tokens
 */
export async function findConnectionsNeedingRefresh(
  expiresWithinMs: number = 5 * 60 * 1000 // Default: 5 minutes
): Promise<AccountingConnection[]> {
  const db = await getDatabase()
  const expiryThreshold = new Date(Date.now() + expiresWithinMs)

  return (await db
    .collection(COLLECTION)
    .find({
      status: 'connected',
      tokenExpiresAt: { $lte: expiryThreshold },
    })
    .toArray()) as unknown as AccountingConnection[]
}

/**
 * Create indexes for performance
 * Called during database initialization
 */
export async function createIndexes(): Promise<void> {
  const db = await getDatabase()
  const col = db.collection(COLLECTION)

  // Primary index - unique connection per tenant/provider
  await col.createIndex(
    { tenantId: 1, provider: 1 },
    { unique: true }
  )

  // For listing by tenant
  await col.createIndex({ tenantId: 1, createdAt: -1 })

  // For finding connections needing refresh
  await col.createIndex(
    { status: 1, tokenExpiresAt: 1 },
    { partialFilterExpression: { status: 'connected' } }
  )

  // By ID lookup
  await col.createIndex({ tenantId: 1, id: 1 })
}
