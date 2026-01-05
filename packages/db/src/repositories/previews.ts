import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { PreviewConfig, ExtractedDesign } from '@madebuy/shared'

const COLLECTION = 'design_previews'
const PREVIEW_TTL_HOURS = 24

/**
 * Ensures TTL index exists on the collection
 * Called once on first use
 */
let indexEnsured = false
async function ensureIndex(): Promise<void> {
  if (indexEnsured) return

  const db = await getDatabase()
  try {
    await db.collection(COLLECTION).createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    )
    indexEnsured = true
  } catch {
    // Index may already exist
    indexEnsured = true
  }
}

/**
 * Creates a new preview configuration
 */
export async function createPreview(
  tenantId: string,
  extractedDesign: ExtractedDesign,
  sourceUrl: string
): Promise<PreviewConfig> {
  await ensureIndex()

  const db = await getDatabase()

  const now = new Date()
  const expiresAt = new Date(now.getTime() + PREVIEW_TTL_HOURS * 60 * 60 * 1000)

  const preview: PreviewConfig = {
    id: nanoid(),
    tenantId,
    extractedDesign,
    sourceUrl,
    createdAt: now,
    expiresAt,
  }

  await db.collection(COLLECTION).insertOne(preview)
  return preview
}

/**
 * Gets a preview by ID
 */
export async function getPreviewById(id: string): Promise<PreviewConfig | null> {
  const db = await getDatabase()
  const preview = await db.collection(COLLECTION).findOne({ id }) as PreviewConfig | null

  if (!preview) return null

  // Check if expired (MongoDB TTL may have slight delay)
  if (new Date() > new Date(preview.expiresAt)) {
    return null
  }

  return preview
}

/**
 * Gets the latest preview for a tenant
 */
export async function getLatestPreviewForTenant(tenantId: string): Promise<PreviewConfig | null> {
  const db = await getDatabase()
  const preview = await db.collection(COLLECTION)
    .findOne(
      { tenantId },
      { sort: { createdAt: -1 } }
    ) as PreviewConfig | null

  if (!preview) return null

  // Check if expired
  if (new Date() > new Date(preview.expiresAt)) {
    return null
  }

  return preview
}

/**
 * Deletes a preview by ID
 */
export async function deletePreview(id: string): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).deleteOne({ id })
  return result.deletedCount > 0
}

/**
 * Deletes all previews for a tenant
 */
export async function deletePreviewsForTenant(tenantId: string): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).deleteMany({ tenantId })
  return result.deletedCount
}
