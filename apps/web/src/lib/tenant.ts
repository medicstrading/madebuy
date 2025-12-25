import { tenants } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'

/**
 * Get tenant by slug (subdomain or username)
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return await tenants.getTenantBySlug(slug)
}

/**
 * Get tenant by custom domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  return await tenants.getTenantByDomain(domain)
}

/**
 * Require tenant - throws if not found
 */
export async function requireTenant(slugOrDomain: string): Promise<Tenant> {
  // Try slug first
  let tenant = await getTenantBySlug(slugOrDomain)

  // If not found, try custom domain
  if (!tenant) {
    tenant = await getTenantByDomain(slugOrDomain)
  }

  if (!tenant) {
    throw new Error('Shop not found')
  }

  return tenant
}
