import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Tenant } from '@madebuy/shared'

export async function createTenant(email: string, passwordHash: string, businessName: string): Promise<Tenant> {
  const db = await getDatabase()

  // Generate slug from business name or email
  const slug = (businessName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const tenant: Tenant = {
    id: nanoid(),
    slug,
    email,
    passwordHash,
    businessName,
    primaryColor: '#2563eb',
    accentColor: '#10b981',
    domainStatus: 'none',
    features: {
      socialPublishing: false,
      aiCaptions: false,
      unlimitedPieces: false,
      customDomain: false,
      prioritySupport: false,
      apiAccess: false,
      advancedAnalytics: false,
    },
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('tenants').insertOne(tenant)
  return tenant
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ id }) as Tenant | null
}

export async function getTenantByEmail(email: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ email }) as Tenant | null
}

export async function getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ customDomain: domain }) as Tenant | null
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ slug }) as Tenant | null
}

export async function getTenantByStripeAccountId(stripeAccountId: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ stripeConnectAccountId: stripeAccountId }) as Tenant | null
}

export async function updateTenantStripeStatus(
  tenantId: string,
  status: 'pending' | 'active' | 'restricted' | 'disabled',
  onboardingComplete: boolean
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        stripeConnectStatus: status,
        stripeConnectOnboardingComplete: onboardingComplete,
        updatedAt: new Date(),
      }
    }
  )
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  // First try custom domain
  let tenant = await getTenantByCustomDomain(domain)
  if (tenant) return tenant

  // Then try as slug (tenant ID)
  return await getTenantBySlug(domain)
}

export async function updateTenant(
  id: string,
  updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deleteTenant(id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').deleteOne({ id })
}

/**
 * Update maker type and categories for a tenant
 */
export async function updateMakerSettings(
  id: string,
  settings: {
    makerType?: Tenant['makerType']
    customCategories?: string[]
    customMaterialCategories?: string[]
  }
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id },
    {
      $set: {
        ...settings,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Add a custom category to a tenant's list
 */
export async function addCustomCategory(
  id: string,
  category: string,
  type: 'product' | 'material' = 'product'
): Promise<void> {
  const db = await getDatabase()
  const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
  await db.collection('tenants').updateOne(
    { id },
    {
      $addToSet: { [field]: category },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Remove a custom category from a tenant's list
 */
export async function removeCustomCategory(
  id: string,
  category: string,
  type: 'product' | 'material' = 'product'
): Promise<void> {
  const db = await getDatabase()
  const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
  await db.collection('tenants').updateOne(
    { id },
    {
      $pull: { [field]: category } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Get all tenants without a maker type (for migration)
 */
export async function getTenantsWithoutMakerType(): Promise<Tenant[]> {
  const db = await getDatabase()
  const docs = await db.collection('tenants').find({
    makerType: { $exists: false }
  }).toArray()
  return docs as unknown as Tenant[]
}

/**
 * Migration: Set default maker type for existing tenants
 */
export async function migrateToMakerType(defaultType: Tenant['makerType'] = 'jewelry'): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection('tenants').updateMany(
    { makerType: { $exists: false } },
    {
      $set: {
        makerType: defaultType,
        updatedAt: new Date()
      }
    }
  )
  return result.modifiedCount
}

/**
 * Batch fetch tenants by IDs (for N+1 query optimization)
 * Returns a Map for O(1) lookup
 */
export async function getTenantsByIds(tenantIds: string[]): Promise<Map<string, Tenant>> {
  if (tenantIds.length === 0) return new Map()

  const db = await getDatabase()
  const uniqueIds = [...new Set(tenantIds)]

  const tenantDocs = await db.collection('tenants')
    .find({ id: { $in: uniqueIds } })
    .project({
      id: 1,
      slug: 1,
      businessName: 1,
      storeName: 1,
      location: 1,
      makerType: 1,
    })
    .toArray()

  return new Map(tenantDocs.map(t => [t.id, t as unknown as Tenant]))
}
