/**
 * Create a platform admin user
 * Usage: npx tsx scripts/create-admin.ts
 */

import { admins } from '../packages/db/src'

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'aaron@madebuy.com.au'
  const password = process.env.ADMIN_PASSWORD || 'changeme123'
  const name = process.env.ADMIN_NAME || 'Aaron'

  console.log('Creating platform admin...')
  console.log(`  Email: ${email}`)
  console.log(`  Name: ${name}`)

  // Check if admin already exists
  const existing = await admins.getAdminByEmail(email)
  if (existing) {
    console.log('\nAdmin already exists!')
    console.log(`  ID: ${existing.id}`)
    console.log(`  Role: ${existing.role}`)
    process.exit(0)
  }

  // Create new admin
  const admin = await admins.createAdmin({
    email,
    password,
    name,
    role: 'owner',
  })

  console.log('\nAdmin created successfully!')
  console.log(`  ID: ${admin.id}`)
  console.log(`  Role: ${admin.role}`)
  console.log('\n⚠️  Remember to change the password after first login!')

  process.exit(0)
}

createAdmin().catch((error) => {
  console.error('Failed to create admin:', error)
  process.exit(1)
})
