import { admins } from '@madebuy/db'
import type { Admin } from '@madebuy/shared'
import { getServerSession } from 'next-auth'
import { cache } from 'react'
import { authOptions } from './auth'

/**
 * Get the current session user (cached per request)
 */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
})

/**
 * Get the current admin from database (cached per request)
 */
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const user = await getCurrentUser()
  if (!user?.id) return null

  return admins.getAdminById(user.id)
})

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require admin - throws if not authenticated or admin not found
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    throw new Error('Unauthorized')
  }
  return admin
}

/**
 * Check if current user is an owner (highest privilege level)
 */
export async function isOwner(): Promise<boolean> {
  const admin = await getCurrentAdmin()
  return admin?.role === 'owner'
}
