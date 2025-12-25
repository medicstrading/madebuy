import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { tenants } from '@madebuy/db'
import type { Tenant } from '@madebuy/shared'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const user = await getCurrentUser()

  if (!user?.id) {
    return null
  }

  return await tenants.getTenantById(user.id)
}

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
