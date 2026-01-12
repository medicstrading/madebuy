import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { tenants } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'

// Cached per-request - prevents duplicate session lookups within same request
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions)
  return session?.user
})

// Cached per-request - prevents duplicate tenant DB lookups within same request
// This is critical: layout, page, and API routes all call this, but now it only
// executes once per request regardless of how many times it's called
export const getCurrentTenant = cache(async (): Promise<Tenant | null> => {
  const user = await getCurrentUser()

  if (!user?.id) {
    return null
  }

  return await tenants.getTenantById(user.id)
})

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    throw new Error('Unauthorized')
  }

  return tenant
}
