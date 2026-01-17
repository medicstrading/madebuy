import { randomBytes } from 'node:crypto'
import type {
  CreateDownloadRecordInput,
  DigitalFile,
  DownloadEvent,
  DownloadFilters,
  DownloadRecord,
  DownloadStats,
  DownloadValidationResult,
} from '@madebuy/shared'
import { getDatabase } from '../client'

const COLLECTION = 'download_records'

/**
 * Generate a cryptographically secure download token
 * 32 bytes = 256 bits of entropy, base64url encoded
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Create a download record for a purchased digital product
 */
export async function createDownloadRecord(
  tenantId: string,
  input: CreateDownloadRecordInput,
): Promise<DownloadRecord> {
  const db = await getDatabase()

  const now = new Date()
  const token = generateSecureToken()

  // Calculate token expiry if expiryDays is specified
  let tokenExpiresAt: Date | undefined
  if (input.expiryDays && input.expiryDays > 0) {
    tokenExpiresAt = new Date(now)
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + input.expiryDays)
  }

  // Generate a unique ID
  const id = randomBytes(12).toString('hex')

  const record: DownloadRecord = {
    id,
    tenantId,
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    pieceId: input.pieceId,
    downloadToken: token,
    tokenExpiresAt,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    downloadCount: 0,
    maxDownloads: input.maxDownloads,
    fileDownloads: {},
    downloads: [],
    isRevoked: false,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection(COLLECTION).insertOne(record)
  return record
}

/**
 * Get a download record by its secure token
 */
export async function getDownloadRecordByToken(
  token: string,
): Promise<DownloadRecord | null> {
  const db = await getDatabase()
  const record = await db
    .collection(COLLECTION)
    .findOne({ downloadToken: token })
  return record as DownloadRecord | null
}

/**
 * Get a download record by ID
 */
export async function getDownloadRecord(
  tenantId: string,
  id: string,
): Promise<DownloadRecord | null> {
  const db = await getDatabase()
  const record = await db.collection(COLLECTION).findOne({ tenantId, id })
  return record as DownloadRecord | null
}

/**
 * Get all download records for an order
 */
export async function getDownloadsForOrder(
  tenantId: string,
  orderId: string,
): Promise<DownloadRecord[]> {
  const db = await getDatabase()
  const records = await db
    .collection(COLLECTION)
    .find({ tenantId, orderId })
    .sort({ createdAt: -1 })
    .toArray()
  return records as unknown as DownloadRecord[]
}

/**
 * List download records with optional filters
 */
export async function listDownloadRecords(
  tenantId: string,
  filters?: DownloadFilters,
): Promise<DownloadRecord[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.orderId) {
    query.orderId = filters.orderId
  }
  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }
  if (filters?.customerEmail) {
    query.customerEmail = filters.customerEmail
  }
  if (filters?.isRevoked !== undefined) {
    query.isRevoked = filters.isRevoked
  }

  const records = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()
  return records as unknown as DownloadRecord[]
}

/**
 * Validate a download attempt and return the result
 * This is the main entry point for the download API
 */
export async function validateDownload(
  token: string,
  fileId: string,
  pieceFiles: DigitalFile[],
): Promise<DownloadValidationResult> {
  const record = await getDownloadRecordByToken(token)

  if (!record) {
    return {
      valid: false,
      error: 'not_found',
      errorMessage: 'Download link not found or invalid.',
    }
  }

  // Check if revoked
  if (record.isRevoked) {
    return {
      valid: false,
      error: 'revoked',
      errorMessage: 'This download link has been disabled.',
      downloadRecord: record,
    }
  }

  // Check if expired
  if (record.tokenExpiresAt && new Date() > new Date(record.tokenExpiresAt)) {
    return {
      valid: false,
      error: 'expired',
      errorMessage: 'This download link has expired.',
      downloadRecord: record,
    }
  }

  // Check download limit
  if (record.maxDownloads && record.downloadCount >= record.maxDownloads) {
    return {
      valid: false,
      error: 'limit_reached',
      errorMessage: `Download limit reached (${record.maxDownloads} downloads).`,
      downloadRecord: record,
      downloadsRemaining: 0,
    }
  }

  // Find the requested file
  const file = pieceFiles.find((f) => f.id === fileId)
  if (!file) {
    return {
      valid: false,
      error: 'file_not_found',
      errorMessage: 'File not found.',
      downloadRecord: record,
    }
  }

  // Calculate remaining downloads
  const downloadsRemaining = record.maxDownloads
    ? record.maxDownloads - record.downloadCount
    : null

  return {
    valid: true,
    downloadRecord: record,
    file: {
      id: file.id,
      name: file.name,
      fileName: file.fileName,
      r2Key: file.r2Key,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
    downloadsRemaining,
  }
}

/**
 * Record a download attempt (successful or failed)
 */
export async function recordDownload(
  token: string,
  event: Omit<DownloadEvent, 'timestamp'>,
): Promise<boolean> {
  const db = await getDatabase()

  const downloadEvent: DownloadEvent = {
    ...event,
    timestamp: new Date(),
  }

  const update: Record<string, unknown> = {
    $push: { downloads: downloadEvent },
    $set: {
      updatedAt: new Date(),
      lastDownloadAt: new Date(),
    },
  }

  // Only increment counts for successful downloads
  if (event.success) {
    update.$inc = {
      downloadCount: 1,
      [`fileDownloads.${event.fileId}`]: 1,
    }
  }

  const result = await db
    .collection(COLLECTION)
    .updateOne({ downloadToken: token }, update)

  return result.modifiedCount > 0
}

/**
 * Regenerate a download token (for support/recovery)
 * Returns the new token
 */
export async function regenerateToken(
  tenantId: string,
  recordId: string,
  newExpiryDays?: number,
): Promise<string | null> {
  const db = await getDatabase()

  const newToken = generateSecureToken()
  const now = new Date()

  const update: Record<string, unknown> = {
    downloadToken: newToken,
    updatedAt: now,
  }

  // Optionally update expiry
  if (newExpiryDays !== undefined) {
    if (newExpiryDays > 0) {
      const newExpiry = new Date(now)
      newExpiry.setDate(newExpiry.getDate() + newExpiryDays)
      update.tokenExpiresAt = newExpiry
    } else {
      update.tokenExpiresAt = null // Remove expiry
    }
  }

  const result = await db
    .collection(COLLECTION)
    .updateOne({ tenantId, id: recordId }, { $set: update })

  return result.modifiedCount > 0 ? newToken : null
}

/**
 * Revoke download access
 */
export async function revokeAccess(
  tenantId: string,
  recordId: string,
  reason?: string,
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).updateOne(
    { tenantId, id: recordId },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
        updatedAt: new Date(),
      },
    },
  )

  return result.modifiedCount > 0
}

/**
 * Restore download access (un-revoke)
 */
export async function restoreAccess(
  tenantId: string,
  recordId: string,
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).updateOne(
    { tenantId, id: recordId },
    {
      $set: {
        isRevoked: false,
        updatedAt: new Date(),
      },
      $unset: {
        revokedAt: '',
        revokedReason: '',
      },
    },
  )

  return result.modifiedCount > 0
}

/**
 * Update download limits
 */
export async function updateDownloadLimits(
  tenantId: string,
  recordId: string,
  maxDownloads?: number,
  expiryDays?: number,
): Promise<boolean> {
  const db = await getDatabase()

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (maxDownloads !== undefined) {
    update.maxDownloads = maxDownloads > 0 ? maxDownloads : null
  }

  if (expiryDays !== undefined) {
    if (expiryDays > 0) {
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + expiryDays)
      update.tokenExpiresAt = newExpiry
    } else {
      update.tokenExpiresAt = null
    }
  }

  const result = await db
    .collection(COLLECTION)
    .updateOne({ tenantId, id: recordId }, { $set: update })

  return result.modifiedCount > 0
}

/**
 * Get download statistics for a piece
 */
export async function getDownloadStats(
  tenantId: string,
  pieceId: string,
): Promise<DownloadStats> {
  const db = await getDatabase()

  const records = (await db
    .collection(COLLECTION)
    .find({ tenantId, pieceId })
    .toArray()) as unknown as DownloadRecord[]

  // Aggregate stats
  let totalDownloads = 0
  const uniqueEmails = new Set<string>()
  const fileDownloadCounts: Record<string, number> = {}
  const allDownloads: DownloadEvent[] = []

  for (const record of records) {
    totalDownloads += record.downloadCount
    uniqueEmails.add(record.customerEmail)

    // Aggregate file downloads
    for (const [fileId, count] of Object.entries(record.fileDownloads)) {
      fileDownloadCounts[fileId] = (fileDownloadCounts[fileId] || 0) + count
    }

    // Collect all download events
    allDownloads.push(...record.downloads)
  }

  // Sort and get top files
  const topFiles = Object.entries(fileDownloadCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([fileId, downloads]) => ({
      fileId,
      fileName: fileId, // Would need to join with piece data for actual names
      downloads,
    }))

  // Get recent downloads (last 50)
  const recentDownloads = allDownloads
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 50)

  return {
    totalDownloads,
    uniqueCustomers: uniqueEmails.size,
    topFiles,
    recentDownloads,
  }
}

/**
 * Delete a download record (for cleanup)
 */
export async function deleteDownloadRecord(
  tenantId: string,
  recordId: string,
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).deleteOne({
    tenantId,
    id: recordId,
  })

  return result.deletedCount > 0
}

/**
 * Get download record by order item (for checking if already created)
 */
export async function getDownloadRecordByOrderItem(
  tenantId: string,
  orderId: string,
  orderItemId: string,
): Promise<DownloadRecord | null> {
  const db = await getDatabase()
  const record = await db.collection(COLLECTION).findOne({
    tenantId,
    orderId,
    orderItemId,
  })
  return record as DownloadRecord | null
}
