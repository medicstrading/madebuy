/**
 * Platform Admins Repository
 * Super-admin users who manage the MadeBuy platform
 */

import type { Admin, AdminRole, CreateAdminInput } from '@madebuy/shared'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

const COLLECTION = 'admins'

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  const db = await getDatabase()

  const passwordHash = await bcrypt.hash(input.password, 10)

  const admin: Admin = {
    id: nanoid(),
    email: input.email.toLowerCase(),
    passwordHash,
    name: input.name,
    role: input.role,
    createdAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(admin)
  return admin
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const db = await getDatabase()
  return (await db.collection(COLLECTION).findOne({ id })) as Admin | null
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .findOne({ email: email.toLowerCase() })) as Admin | null
}

export async function listAdmins(): Promise<Admin[]> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .find()
    .sort({ createdAt: -1 })
    .toArray()) as unknown as Admin[]
}

export async function updateAdmin(
  id: string,
  updates: Partial<Pick<Admin, 'name' | 'role'>>,
): Promise<Admin | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )
  return result as Admin | null
}

export async function updateAdminPassword(
  id: string,
  newPassword: string,
): Promise<boolean> {
  const db = await getDatabase()
  const passwordHash = await bcrypt.hash(newPassword, 10)
  const result = await db.collection(COLLECTION).updateOne(
    { id },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    },
  )
  return result.modifiedCount === 1
}

export async function updateLastLogin(id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection(COLLECTION).updateOne(
    { id },
    {
      $set: {
        lastLoginAt: new Date(),
      },
    },
  )
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).deleteOne({ id })
  return result.deletedCount === 1
}

export async function verifyPassword(
  admin: Admin,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, admin.passwordHash)
}

export async function getAdminCount(): Promise<number> {
  const db = await getDatabase()
  return db.collection(COLLECTION).countDocuments()
}

// Check if any admins exist (for initial setup)
export async function hasAdmins(): Promise<boolean> {
  const count = await getAdminCount()
  return count > 0
}
