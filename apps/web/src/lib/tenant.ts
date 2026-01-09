import { cache } from 'react'
import { tenants, domains } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'

/**
 * Get tenant by slug (subdomain or username)
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  return await tenants.getTenantBySlug(slug)
})

/**
 * Get tenant by ID
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getTenantById = cache(async (id: string): Promise<Tenant | null> => {
  return await tenants.getTenantById(id)
})

/**
 * Get tenant by custom domain (from tenants repository)
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getTenantByDomain = cache(async (domain: string): Promise<Tenant | null> => {
  return await tenants.getTenantByDomain(domain)
})

/**
 * Get tenant by custom domain (from domains repository - checks active domain status)
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getTenantByActiveDomain = cache(async (domain: string): Promise<Tenant | null> => {
  return await domains.getTenantByDomain(domain)
})

/**
 * Require tenant - throws if not found
 * Uses cached functions internally for deduplication
 */
export const requireTenant = cache(async (slugOrDomain: string): Promise<Tenant> => {
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
})
