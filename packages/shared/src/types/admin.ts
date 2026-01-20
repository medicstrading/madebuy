/**
 * Platform Admin Types
 * Super-admin users who manage the MadeBuy platform
 */

export type AdminRole = 'owner' | 'support'

export interface Admin {
  id: string
  email: string
  passwordHash: string
  name: string
  role: AdminRole
  createdAt: Date
  lastLoginAt?: Date
  updatedAt?: Date
}

export interface CreateAdminInput {
  email: string
  password: string
  name: string
  role: AdminRole
}

export interface UpdateAdminInput {
  name?: string
  role?: AdminRole
}

export interface AdminSession {
  id: string
  email: string
  name: string
  role: AdminRole
}

// Impersonation token payload
export interface ImpersonationToken {
  tenantId: string
  adminId: string
  adminEmail: string
  impersonatedAt: number
  expiresAt: number
}
