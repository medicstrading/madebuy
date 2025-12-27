import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Tenant } from '@madebuy/shared'

export async function createTenant(email: string, passwordHash: string, businessName: string): Promise<Tenant> {
  const db = await getDatabase()

  const tenant: Tenant = {
    id: nanoid(),
    email,
    passwordHash,
    businessName,
    primaryColor: '#2563eb',
    accentColor: '#10b981',
    domainStatus: 'none',
    features: {
      socialPublishing: true,
      aiCaptions: true,
      multiChannelOrders: false,
      advancedAnalytics: false,
      unlimitedPieces: false,
      customDomain: false,
      marketplaceListing: false,
      marketplaceFeatured: false,
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
