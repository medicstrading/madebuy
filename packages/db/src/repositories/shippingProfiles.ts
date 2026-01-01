import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  ShippingProfile,
  ShippingProfileInput,
  CreateShippingProfileInput,
  UpdateShippingProfileInput,
  ShippingZone,
} from '@madebuy/shared'

const COLLECTION = 'shipping_profiles'

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new shipping profile
 * Supports both legacy ShippingProfileInput and new CreateShippingProfileInput
 */
export async function createProfile(
  tenantId: string,
  data: ShippingProfileInput | CreateShippingProfileInput
): Promise<ShippingProfile> {
  const db = await getDatabase()
  const now = new Date()

  // If this is set as default, unset other defaults first
  if (data.isDefault) {
    await db.collection(COLLECTION).updateMany(
      { tenantId, isDefault: true },
      { $set: { isDefault: false, updatedAt: now } }
    )
  }

  // Generate IDs for zones if provided
  const zones: ShippingZone[] | undefined = 'zones' in data && data.zones
    ? data.zones.map(zone => ({
        ...zone,
        id: nanoid(),
      }))
    : undefined

  // Determine method from rateType if not provided
  const method = 'method' in data && data.method
    ? data.method
    : data.rateType === 'flat' ? 'flat'
    : data.rateType === 'calculated' ? 'calculated'
    : 'flat'

  const profile: ShippingProfile = {
    id: nanoid(),
    tenantId,
    name: data.name,
    carrier: data.carrier,
    isDefault: data.isDefault ?? false,

    // New fields
    method,
    processingDays: 'processingDays' in data ? data.processingDays : undefined,
    zones,
    defaultPackage: 'defaultPackage' in data ? data.defaultPackage : undefined,
    freeThreshold: 'freeThreshold' in data ? data.freeThreshold : undefined,
    isActive: true,

    // Legacy fields (always populated for backwards compatibility)
    rateType: data.rateType ?? 'flat',
    flatRate: data.flatRate,
    weightRates: data.weightRates,
    freeShippingThreshold: data.freeShippingThreshold,
    domesticOnly: data.domesticOnly ?? true,
    maxWeight: data.maxWeight,

    createdAt: now,
    updatedAt: now,
  }

  await db.collection(COLLECTION).insertOne(profile)
  return profile
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get a specific shipping profile by ID
 */
export async function getProfile(
  tenantId: string,
  profileId: string
): Promise<ShippingProfile | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({ tenantId, id: profileId })
  return result as unknown as ShippingProfile | null
}

/**
 * Get the default shipping profile for a tenant
 */
export async function getDefaultProfile(tenantId: string): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  // Try to get the default profile (active only)
  let result = await db.collection(COLLECTION).findOne({
    tenantId,
    isDefault: true,
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }, // Legacy profiles without isActive
    ],
  })

  // If no default, get the first active one
  if (!result) {
    result = await db.collection(COLLECTION).findOne({
      tenantId,
      $or: [
        { isActive: true },
        { isActive: { $exists: false } },
      ],
    })
  }

  return result as unknown as ShippingProfile | null
}

/**
 * List all shipping profiles for a tenant
 */
export async function listProfiles(
  tenantId: string,
  options?: {
    activeOnly?: boolean
  }
): Promise<ShippingProfile[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  // Filter by active status if requested
  if (options?.activeOnly) {
    query.$or = [
      { isActive: true },
      { isActive: { $exists: false } }, // Include legacy profiles
    ]
  }

  const results = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ isDefault: -1, createdAt: -1 })
    .toArray()

  return results as unknown as ShippingProfile[]
}

/**
 * Get profiles by carrier type
 */
export async function getProfilesByCarrier(
  tenantId: string,
  carrier: ShippingProfile['carrier']
): Promise<ShippingProfile[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      carrier,
      $or: [
        { isActive: true },
        { isActive: { $exists: false } },
      ],
    })
    .sort({ isDefault: -1, createdAt: -1 })
    .toArray()

  return results as unknown as ShippingProfile[]
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update a shipping profile
 */
export async function updateProfile(
  tenantId: string,
  profileId: string,
  updates: Partial<ShippingProfileInput> | UpdateShippingProfileInput
): Promise<ShippingProfile | null> {
  const db = await getDatabase()
  const now = new Date()

  // If setting as default, unset other defaults first
  if (updates.isDefault) {
    await db.collection(COLLECTION).updateMany(
      { tenantId, isDefault: true, id: { $ne: profileId } },
      { $set: { isDefault: false, updatedAt: now } }
    )
  }

  // Generate IDs for new zones if provided
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: now,
  }

  if ('zones' in updates && updates.zones) {
    updateData.zones = updates.zones.map(zone => ({
      ...zone,
      id: 'id' in zone ? zone.id : nanoid(),
    }))
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    { $set: updateData },
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

/**
 * Set a profile as the default
 */
export async function setDefaultProfile(
  tenantId: string,
  profileId: string
): Promise<ShippingProfile | null> {
  const db = await getDatabase()
  const now = new Date()

  // Unset all other defaults
  await db.collection(COLLECTION).updateMany(
    { tenantId },
    { $set: { isDefault: false, updatedAt: now } }
  )

  // Set this one as default
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    { $set: { isDefault: true, updatedAt: now } },
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

/**
 * Activate or deactivate a shipping profile
 */
export async function setProfileActive(
  tenantId: string,
  profileId: string,
  isActive: boolean
): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    {
      $set: {
        isActive,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

/**
 * Add a zone to an existing profile
 */
export async function addZone(
  tenantId: string,
  profileId: string,
  zone: Omit<ShippingZone, 'id'>
): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  const newZone: ShippingZone = {
    ...zone,
    id: nanoid(),
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    {
      $push: { zones: newZone },
      $set: { updatedAt: new Date() },
    } as any, // MongoDB driver types are overly strict for $push operations
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

/**
 * Update a specific zone in a profile
 */
export async function updateZone(
  tenantId: string,
  profileId: string,
  zoneId: string,
  updates: Partial<Omit<ShippingZone, 'id'>>
): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  // Build update object for array element
  const updateFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    updateFields[`zones.$[zone].${key}`] = value
  }
  updateFields.updatedAt = new Date()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    { $set: updateFields },
    {
      arrayFilters: [{ 'zone.id': zoneId }],
      returnDocument: 'after',
    }
  )

  return result as unknown as ShippingProfile | null
}

/**
 * Remove a zone from a profile
 */
export async function removeZone(
  tenantId: string,
  profileId: string,
  zoneId: string
): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    {
      $pull: { zones: { id: zoneId } },
      $set: { updatedAt: new Date() },
    } as any, // MongoDB driver types are overly strict for $pull operations
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete a shipping profile
 */
export async function deleteProfile(
  tenantId: string,
  profileId: string
): Promise<boolean> {
  const db = await getDatabase()

  // Check if this is the default - if so, don't allow deletion unless it's the only one
  const profile = await db.collection(COLLECTION).findOne({ tenantId, id: profileId })

  if (profile?.isDefault) {
    const count = await db.collection(COLLECTION).countDocuments({ tenantId })
    if (count > 1) {
      throw new Error('Cannot delete default shipping profile. Set another profile as default first.')
    }
  }

  const result = await db.collection(COLLECTION).deleteOne({ tenantId, id: profileId })
  return result.deletedCount > 0
}

// ============================================================================
// Stats & Utilities
// ============================================================================

/**
 * Count shipping profiles for a tenant
 */
export async function countProfiles(
  tenantId: string,
  options?: { activeOnly?: boolean }
): Promise<number> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (options?.activeOnly) {
    query.$or = [
      { isActive: true },
      { isActive: { $exists: false } },
    ]
  }

  return await db.collection(COLLECTION).countDocuments(query)
}

/**
 * Check if a tenant has any shipping profiles configured
 */
export async function hasProfiles(tenantId: string): Promise<boolean> {
  const count = await countProfiles(tenantId)
  return count > 0
}

/**
 * Get profile summary for dashboard
 */
export async function getProfileSummary(
  tenantId: string
): Promise<{
  total: number
  active: number
  byCarrier: Record<string, number>
  hasDefault: boolean
}> {
  const db = await getDatabase()

  const profiles = await listProfiles(tenantId)

  const byCarrier: Record<string, number> = {}
  let activeCount = 0
  let hasDefault = false

  for (const profile of profiles) {
    // Count by carrier
    byCarrier[profile.carrier] = (byCarrier[profile.carrier] || 0) + 1

    // Count active
    if (profile.isActive !== false) {
      activeCount++
    }

    // Check for default
    if (profile.isDefault) {
      hasDefault = true
    }
  }

  return {
    total: profiles.length,
    active: activeCount,
    byCarrier,
    hasDefault,
  }
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Ensure indexes are created for optimal query performance
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()
  const collection = db.collection(COLLECTION)

  await Promise.all([
    collection.createIndex({ tenantId: 1, id: 1 }, { unique: true }),
    collection.createIndex({ tenantId: 1, isDefault: 1 }),
    collection.createIndex({ tenantId: 1, carrier: 1 }),
    collection.createIndex({ tenantId: 1, isActive: 1 }),
  ])
}
