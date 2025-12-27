/**
 * Migration script: pieces → products
 *
 * Transforms jewelry-specific Piece schema to generic Product schema
 * with flexible attributes and marketplace fields.
 *
 * Strategy: Dual-write for zero downtime
 * - Phase 1: Run this script to copy all pieces → products
 * - Phase 2: Enable dual-write in code (write to both collections)
 * - Phase 3: Gradual cutover (USE_PRODUCTS_PERCENT environment variable)
 * - Phase 4: Cleanup after 30 days stable
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." MONGODB_DB="madebuy" npx tsx scripts/migrate-pieces-to-products.ts
 *
 *   Options:
 *   --dry-run : Preview changes without writing
 *   --batch-size=100 : Process in batches (default: 100)
 *   --skip-indexes : Skip index creation
 */

import { MongoClient } from 'mongodb'

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100')
const SKIP_INDEXES = process.argv.includes('--skip-indexes')

interface Piece {
  _id: any
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string

  // Jewelry-specific (to be moved to attributes)
  stones: string[]
  metals: string[]
  techniques: string[]
  dimensions?: string
  weight?: string
  chainLength?: string

  // Generic fields
  price?: number
  currency: string
  cogs?: number
  stock?: number
  status: string
  mediaIds: string[]
  primaryMediaId?: string
  socialVideos?: any[]
  integrations?: any
  isFeatured: boolean
  category: string
  tags: string[]
  isPublishedToWebsite: boolean
  websiteSlug?: string
  viewCount?: number
  createdAt: Date
  updatedAt: Date
  soldAt?: Date
  soldTo?: any
}

async function main() {
  console.log('🚀 MadeBuy Migration: pieces → products\n')
  console.log(`MongoDB URI: ${MONGODB_URI}`)
  console.log(`Database: ${MONGODB_DB}`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Skip indexes: ${SKIP_INDEXES}\n`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB\n')

    const db = client.db(MONGODB_DB)
    const piecesCollection = db.collection('pieces')
    const productsCollection = db.collection('products')

    // Step 1: Count pieces to migrate
    const totalPieces = await piecesCollection.countDocuments()
    console.log(`📊 Found ${totalPieces} pieces to migrate\n`)

    if (totalPieces === 0) {
      console.log('⚠️  No pieces found. Nothing to migrate.')
      return
    }

    // Step 2: Check if products collection exists
    const existingProducts = await productsCollection.countDocuments()
    if (existingProducts > 0 && !DRY_RUN) {
      console.log(`⚠️  Products collection already has ${existingProducts} documents`)
      console.log('   Run with --dry-run first to preview changes\n')

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise<string>(resolve => {
        readline.question('   Continue and potentially overwrite existing products? (yes/no): ', resolve)
      })
      readline.close()

      if (answer.toLowerCase() !== 'yes') {
        console.log('   Migration cancelled')
        return
      }
    }

    // Step 3: Migrate in batches
    let migrated = 0
    let errors = 0
    let cursor = piecesCollection.find()

    console.log('🔄 Starting migration...\n')

    while (await cursor.hasNext()) {
      const batch: Piece[] = []

      // Collect batch
      for (let i = 0; i < BATCH_SIZE && await cursor.hasNext(); i++) {
        const piece = await cursor.next() as Piece | null
        if (piece) batch.push(piece)
      }

      if (batch.length === 0) break

      // Transform batch
      const products = batch.map(piece => transformPieceToProduct(piece))

      // Write batch (if not dry run)
      if (!DRY_RUN) {
        try {
          await productsCollection.bulkWrite(
            products.map(product => ({
              updateOne: {
                filter: { id: product.id, tenantId: product.tenantId },
                update: { $set: product },
                upsert: true
              }
            }))
          )
          migrated += batch.length
        } catch (err) {
          console.error(`❌ Error migrating batch:`, err)
          errors += batch.length
        }
      } else {
        migrated += batch.length
      }

      // Progress update
      if (migrated % 500 === 0 || migrated === totalPieces) {
        const percent = Math.round((migrated / totalPieces) * 100)
        console.log(`   Progress: ${migrated}/${totalPieces} (${percent}%)`)
      }
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Errors: ${errors}`)

    // Step 4: Create indexes (if not skipped)
    if (!SKIP_INDEXES && !DRY_RUN) {
      console.log('\n📇 Creating indexes...')
      await createProductIndexes(db)
      console.log('✅ Indexes created')
    }

    // Step 5: Validation
    console.log('\n🔍 Validation:')
    const finalProductCount = await productsCollection.countDocuments()
    console.log(`   Pieces collection: ${totalPieces} documents`)
    console.log(`   Products collection: ${finalProductCount} documents`)

    if (totalPieces === finalProductCount) {
      console.log('   ✅ Counts match!')
    } else {
      console.log(`   ⚠️  Mismatch! Difference: ${Math.abs(totalPieces - finalProductCount)}`)
    }

    // Step 6: Sample comparison
    console.log('\n🔬 Sample comparison (first document):')
    const samplePiece = await piecesCollection.findOne()
    const sampleProduct = await productsCollection.findOne({ id: samplePiece?.id })

    console.log('   Piece:', JSON.stringify(samplePiece, null, 2).substring(0, 300) + '...')
    console.log('   Product:', JSON.stringify(sampleProduct, null, 2).substring(0, 300) + '...')

    console.log('\n✨ Migration script complete!')
    console.log('\nNext steps:')
    console.log('1. Review the migrated data')
    console.log('2. Enable dual-write mode in code')
    console.log('3. Gradually cutover using USE_PRODUCTS_PERCENT env var')
    console.log('4. After 30 days stable, archive pieces collection\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Disconnected from MongoDB')
  }
}

/**
 * Transform Piece to Product
 */
function transformPieceToProduct(piece: Piece): any {
  return {
    // Copy MongoDB _id for consistency
    _id: piece._id,

    // Core fields (unchanged)
    id: piece.id,
    tenantId: piece.tenantId,
    name: piece.name,
    slug: piece.slug,
    description: piece.description,

    // Generic categorization
    category: 'jewelry', // All existing pieces are jewelry
    subcategory: piece.category, // Old category becomes subcategory
    tags: piece.tags || [],

    // Flexible attributes (jewelry-specific fields moved here)
    attributes: {
      stones: piece.stones || [],
      metals: piece.metals || [],
      techniques: piece.techniques || [],
      dimensions: piece.dimensions,
      weight: piece.weight,
      chainLength: piece.chainLength,
    },

    // Pricing (unchanged)
    price: piece.price,
    currency: piece.currency || 'USD',
    cogs: piece.cogs,

    // Inventory (unchanged)
    stock: piece.stock,

    // Status (unchanged)
    status: piece.status,

    // Media (unchanged)
    mediaIds: piece.mediaIds || [],
    primaryMediaId: piece.primaryMediaId,

    // Social videos (unchanged)
    socialVideos: piece.socialVideos || [],

    // Integrations (unchanged)
    integrations: piece.integrations || {},

    // NEW: Marketplace fields (default to not listed)
    marketplace: {
      listed: false, // Tenants must manually opt-in
      categories: ['jewelry'], // Default to jewelry category
      marketplaceViews: 0,
      marketplaceSales: 0,
      approvalStatus: 'pending', // Requires approval before listing
      avgRating: 0,
      totalReviews: 0,
    },

    // Display (unchanged)
    isFeatured: piece.isFeatured || false,

    // Publishing (unchanged)
    isPublishedToWebsite: piece.isPublishedToWebsite || false,
    websiteSlug: piece.websiteSlug,

    // Analytics (unchanged)
    viewCount: piece.viewCount || 0,

    // Timestamps (unchanged)
    createdAt: piece.createdAt,
    updatedAt: piece.updatedAt,
    soldAt: piece.soldAt,

    // Customer info (unchanged)
    soldTo: piece.soldTo,
  }
}

/**
 * Create indexes for products collection
 * CRITICAL: These enable cross-tenant marketplace queries
 */
async function createProductIndexes(db: any) {
  const productsCollection = db.collection('products')

  // Tenant-scoped indexes (existing pattern)
  await productsCollection.createIndex({ tenantId: 1 })
  await productsCollection.createIndex({ tenantId: 1, slug: 1 }, { unique: true })
  await productsCollection.createIndex({ tenantId: 1, status: 1 })
  await productsCollection.createIndex({ tenantId: 1, category: 1 })
  await productsCollection.createIndex({ tenantId: 1, isFeatured: 1 })
  await productsCollection.createIndex({ tenantId: 1, createdAt: -1 })

  // CROSS-TENANT marketplace indexes (NEW)
  // These don't filter by tenantId - they query across all tenants
  await productsCollection.createIndex({
    'marketplace.listed': 1,
    'marketplace.approvalStatus': 1,
    'marketplace.categories': 1
  }, { name: 'marketplace_browse' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    'marketplace.avgRating': -1
  }, { name: 'marketplace_rating' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    price: 1
  }, { name: 'marketplace_price' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    createdAt: -1
  }, { name: 'marketplace_recent' })

  // Full-text search (cross-tenant)
  await productsCollection.createIndex({
    name: 'text',
    description: 'text',
    tags: 'text'
  }, { name: 'product_search' })

  console.log('   ✅ Created 11 indexes')
}

// Run migration
main().catch(console.error)
