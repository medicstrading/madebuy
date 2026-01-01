import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { ShippingProfile, ShippingProfileInput } from '@madebuy/shared'

const COLLECTION = 'shipping_profiles'

/**
 * Create a new shipping profile
 */
export async function createProfile(
  tenantId: string,
  data: ShippingProfileInput
): Promise<ShippingProfile> {
  const db = await getDatabase()

  // If this is set as default, unset other defaults first
  if (data.isDefault) {
    await db.collection(COLLECTION).updateMany(
      { tenantId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    )
  }

  const profile: ShippingProfile = {
    id: nanoid(),
    tenantId,
    name: data.name,
    carrier: data.carrier,
    isDefault: data.isDefault ?? false,
    rateType: data.rateType,
    flatRate: data.flatRate,
    weightRates: data.weightRates,
    freeShippingThreshold: data.freeShippingThreshold,
    domesticOnly: data.domesticOnly ?? true,
    maxWeight: data.maxWeight,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(profile)
  return profile
}

/**
 * List all shipping profiles for a tenant
 */
export async function listProfiles(tenantId: string): Promise<ShippingProfile[]> {
  const db = await getDatabase()
  const results = await db
    .collection(COLLECTION)
    .find({ tenantId })
    .sort({ isDefault: -1, createdAt: -1 })
    .toArray()

  return results as unknown as ShippingProfile[]
}

/**
 * Get a specific shipping profile
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

  // Try to get the default profile
  let result = await db.collection(COLLECTION).findOne({ tenantId, isDefault: true })

  // If no default, get the first one
  if (!result) {
    result = await db.collection(COLLECTION).findOne({ tenantId })
  }

  return result as unknown as ShippingProfile | null
}

/**
 * Update a shipping profile
 */
export async function updateProfile(
  tenantId: string,
  profileId: string,
  updates: Partial<ShippingProfileInput>
): Promise<ShippingProfile | null> {
  const db = await getDatabase()

  // If setting as default, unset other defaults first
  if (updates.isDefault) {
    await db.collection(COLLECTION).updateMany(
      { tenantId, isDefault: true, id: { $ne: profileId } },
      { $set: { isDefault: false, updatedAt: new Date() } }
    )
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: profileId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as ShippingProfile | null
}

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

/**
 * Set a profile as the default
 */
export async function setDefaultProfile(
  tenantId: string,
  profileId: string
): Promise<void> {
  const db = await getDatabase()

  // Unset all other defaults
  await db.collection(COLLECTION).updateMany(
    { tenantId },
    { $set: { isDefault: false, updatedAt: new Date() } }
  )

  // Set this one as default
  await db.collection(COLLECTION).updateOne(
    { tenantId, id: profileId },
    { $set: { isDefault: true, updatedAt: new Date() } }
  )
}

/**
 * Count shipping profiles for a tenant
 */
export async function countProfiles(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection(COLLECTION).countDocuments({ tenantId })
}
