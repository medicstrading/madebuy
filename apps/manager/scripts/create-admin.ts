/**
 * Create a platform admin account
 * Usage: ADMIN_EMAIL=x ADMIN_PASSWORD=y ADMIN_NAME=z npx tsx scripts/create-admin.ts
 */

import { admins } from '@madebuy/db'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'

  if (!email || !password) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables')
    process.exit(1)
  }

  // Check if admin already exists
  const existing = await admins.getAdminByEmail(email)
  if (existing) {
    console.log(`Admin with email ${email} already exists`)
    process.exit(0)
  }

  // Create admin
  const admin = await admins.createAdmin({
    email,
    password,
    name,
    role: 'owner',
  })

  console.log('Admin created successfully:')
  console.log(`  ID: ${admin.id}`)
  console.log(`  Email: ${admin.email}`)
  console.log(`  Name: ${admin.name}`)
  console.log(`  Role: ${admin.role}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Error creating admin:', err)
  process.exit(1)
})
