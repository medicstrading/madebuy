/**
 * Remove Test Data Script
 *
 * Removes all pieces, products, and media tagged with "test-data"
 *
 * Usage: npx tsx scripts/remove-test-data.ts <tenant-slug>
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

async function removeTestData(tenantSlug: string) {
  console.log(`\n🧹 Removing test data for tenant: ${tenantSlug}\n`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(MONGODB_DB)

    // Find tenant
    const tenant = await db.collection('tenants').findOne({ slug: tenantSlug })
    if (!tenant) {
      console.error(`❌ Tenant not found: ${tenantSlug}`)
      process.exit(1)
    }

    const tenantId = tenant.id
    console.log(`📦 Tenant ID: ${tenantId}`)

    // Remove test pieces
    const piecesResult = await db.collection('pieces').deleteMany({
      tenantId,
      tags: 'test-data',
    })
    console.log(`🗑️  Removed ${piecesResult.deletedCount} test pieces`)

    // Remove test products (marketplace)
    const productsResult = await db.collection('products').deleteMany({
      tenantId,
      tags: 'test-data',
    })
    console.log(`🗑️  Removed ${productsResult.deletedCount} test products`)

    // Remove test media
    const mediaResult = await db.collection('media').deleteMany({
      tenantId,
      tags: 'test-data',
    })
    console.log(`🗑️  Removed ${mediaResult.deletedCount} test media items`)

    // Also remove pieces with [TEST] in name (backup check)
    const testNameResult = await db.collection('pieces').deleteMany({
      tenantId,
      name: { $regex: /^\[TEST\]/ },
    })
    if (testNameResult.deletedCount > 0) {
      console.log(`🗑️  Removed ${testNameResult.deletedCount} additional [TEST] pieces`)
    }

    // Also remove products with [TEST] in name (backup check)
    const testNameProductsResult = await db.collection('products').deleteMany({
      tenantId,
      name: { $regex: /^\[TEST\]/ },
    })
    if (testNameProductsResult.deletedCount > 0) {
      console.log(`🗑️  Removed ${testNameProductsResult.deletedCount} additional [TEST] products`)
    }

    console.log(`\n✅ Test data removed successfully!\n`)

  } catch (error) {
    console.error('Error removing data:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Run if called directly
const tenantSlug = process.argv[2]
if (!tenantSlug) {
  console.log('Usage: npx ts-node scripts/remove-test-data.ts <tenant-slug>')
  console.log('Example: npx ts-node scripts/remove-test-data.ts my-store')
  process.exit(1)
}

removeTestData(tenantSlug)
