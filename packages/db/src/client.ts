import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

if (!MONGODB_URI && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  MONGODB_URI environment variable not set')
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDatabase(): Promise<Db> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  if (cachedDb) return cachedDb

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      // Connection pool settings optimized for serverless/edge
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
      maxConnecting: 2,
      // Reliability settings
      retryWrites: true,
      retryReads: true,
      // Timeout settings
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    })
    await cachedClient.connect()
    console.log('✅ Connected to MongoDB')
  }

  cachedDb = cachedClient.db(MONGODB_DB)
  await ensureIndexes(cachedDb)

  return cachedDb
}

/**
 * Get the raw MongoDB client for transactions
 * Use getDatabase() for normal operations
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  if (!cachedClient) {
    // This will initialize the client
    await getDatabase()
  }

  return cachedClient!
}

/**
 * Ensure all required indexes exist for multi-tenant security and performance
 * CRITICAL: All collections must be indexed by tenantId first!
 */
async function ensureIndexes(db: Db) {
  console.log('📑 Creating database indexes...')

  // Tenants
  await db.collection('tenants').createIndex({ email: 1 }, { unique: true })
  await db.collection('tenants').createIndex({ slug: 1 }, { unique: true })
  await db.collection('tenants').createIndex({ id: 1 }, { unique: true })
  await db.collection('tenants').createIndex({ customDomain: 1 }, { sparse: true })

  // Pieces - ALWAYS filter by tenantId first
  await db.collection('pieces').createIndex({ tenantId: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, slug: 1 }, { unique: true })
  await db.collection('pieces').createIndex({ tenantId: 1, status: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, category: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, isFeatured: 1 })
  // Low stock query optimization (P1 fix)
  await db.collection('pieces').createIndex(
    { tenantId: 1, lowStockThreshold: 1, stock: 1 },
    { name: 'low_stock_pieces' }
  )
  // Full-text search index for storefront search
  await db.collection('pieces').createIndex(
    { name: 'text', description: 'text', tags: 'text', category: 'text' },
    { weights: { name: 10, tags: 5, category: 3, description: 1 }, name: 'pieces_text_search' }
  )

  // Media
  await db.collection('media').createIndex({ tenantId: 1 })
  await db.collection('media').createIndex({ tenantId: 1, createdAt: -1 })
  await db.collection('media').createIndex({ pieceId: 1 })
  await db.collection('media').createIndex({ tenantId: 1, isFavorite: 1 })

  // Materials
  await db.collection('materials').createIndex({ tenantId: 1 })
  await db.collection('materials').createIndex({ tenantId: 1, category: 1 })
  await db.collection('materials').createIndex({ tenantId: 1, isLowStock: 1 })

  // Material Usages
  await db.collection('material_usages').createIndex({ tenantId: 1 })
  await db.collection('material_usages').createIndex({ pieceId: 1 })
  await db.collection('material_usages').createIndex({ materialId: 1 })

  // Orders
  await db.collection('orders').createIndex({ tenantId: 1 })
  await db.collection('orders').createIndex({ tenantId: 1, status: 1 })
  await db.collection('orders').createIndex({ tenantId: 1, createdAt: -1 })
  await db.collection('orders').createIndex({ tenantId: 1, customerEmail: 1 })
  await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true })
  // Stripe session ID for idempotency checks (sparse since not all orders have it)
  await db.collection('orders').createIndex({ stripeSessionId: 1 }, { sparse: true })
  // Compound index for efficient order listing with status filter and date sorting
  await db.collection('orders').createIndex({ tenantId: 1, status: 1, createdAt: -1 })

  // Promotions
  await db.collection('promotions').createIndex({ tenantId: 1 })
  await db.collection('promotions').createIndex({ code: 1 }, { sparse: true, unique: true })
  await db.collection('promotions').createIndex({ tenantId: 1, isActive: 1 })

  // Publish Records
  await db.collection('publish_records').createIndex({ tenantId: 1 })
  await db.collection('publish_records').createIndex({ tenantId: 1, status: 1 })
  await db.collection('publish_records').createIndex({ tenantId: 1, scheduledFor: 1 })

  // Enquiries
  await db.collection('enquiries').createIndex({ tenantId: 1 })
  await db.collection('enquiries').createIndex({ tenantId: 1, status: 1 })
  await db.collection('enquiries').createIndex({ tenantId: 1, createdAt: -1 })

  // Accounting Connections
  await db.collection('accounting_connections').createIndex(
    { tenantId: 1, provider: 1 },
    { unique: true }
  )
  await db.collection('accounting_connections').createIndex({ tenantId: 1, createdAt: -1 })
  await db.collection('accounting_connections').createIndex(
    { status: 1, tokenExpiresAt: 1 },
    { partialFilterExpression: { status: 'connected' } }
  )

  // Payouts
  await db.collection('payouts').createIndex({ tenantId: 1 })
  await db.collection('payouts').createIndex({ tenantId: 1, createdAt: -1 })
  await db.collection('payouts').createIndex({ tenantId: 1, status: 1 })
  await db.collection('payouts').createIndex({ stripePayoutId: 1 }, { unique: true })
  await db.collection('payouts').createIndex({ tenantId: 1, arrivalDate: -1 })

  // Download Records (digital products)
  await db.collection('download_records').createIndex({ tenantId: 1 })
  await db.collection('download_records').createIndex({ tenantId: 1, orderId: 1 })
  await db.collection('download_records').createIndex({ tenantId: 1, pieceId: 1 })
  await db.collection('download_records').createIndex({ downloadToken: 1 }, { unique: true })
  await db.collection('download_records').createIndex(
    { tokenExpiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { tokenExpiresAt: { $exists: true } } }
  )

  // Products (marketplace - cross-tenant)
  await db.collection('products').createIndex({ id: 1 }, { unique: true })
  await db.collection('products').createIndex({ slug: 1 })
  await db.collection('products').createIndex({ tenantId: 1 })
  await db.collection('products').createIndex({ tenantId: 1, 'marketplace.listed': 1, 'marketplace.approvalStatus': 1 })
  await db.collection('products').createIndex({ 'marketplace.listed': 1, 'marketplace.approvalStatus': 1 })
  await db.collection('products').createIndex({ 'marketplace.listed': 1, 'marketplace.approvalStatus': 1, createdAt: -1 })
  await db.collection('products').createIndex({ 'marketplace.listed': 1, 'marketplace.approvalStatus': 1, 'marketplace.categories': 1 })
  await db.collection('products').createIndex({ 'marketplace.listed': 1, 'marketplace.approvalStatus': 1, price: 1 })

  // Seller Profiles (marketplace)
  await db.collection('seller_profiles').createIndex({ tenantId: 1 }, { unique: true })
  await db.collection('seller_profiles').createIndex({ 'stats.totalSales': -1, 'stats.avgRating': -1 })

  // Marketplace Reviews
  await db.collection('marketplace_reviews').createIndex({ productId: 1, status: 1 })
  await db.collection('marketplace_reviews').createIndex({ tenantId: 1 })

  // Tenant Marketplace Stats
  await db.collection('tenant_marketplace_stats').createIndex({ tenantId: 1 }, { unique: true })

  // Variant Combinations (product variants with SKU, stock, price)
  await db.collection('variant_combinations').createIndex({ tenantId: 1 })
  await db.collection('variant_combinations').createIndex({ tenantId: 1, pieceId: 1 })
  await db.collection('variant_combinations').createIndex({ tenantId: 1, sku: 1 }, { unique: true })
  await db.collection('variant_combinations').createIndex({ tenantId: 1, id: 1 })
  await db.collection('variant_combinations').createIndex(
    { tenantId: 1, stock: 1 },
    { partialFilterExpression: { isDeleted: false } }
  )
  await db.collection('variant_combinations').createIndex(
    { tenantId: 1, isDeleted: 1, stock: 1 },
    { name: 'low_stock_lookup' }
  )

  // Discount Codes
  await db.collection('discount_codes').createIndex({ tenantId: 1, code: 1 }, { unique: true })
  await db.collection('discount_codes').createIndex({ tenantId: 1, isActive: 1 })
  await db.collection('discount_codes').createIndex({ tenantId: 1, expiresAt: 1 })

  // Newsletters
  await db.collection('newsletters').createIndex({ tenantId: 1, status: 1 })
  await db.collection('newsletters').createIndex({ tenantId: 1, createdAt: -1 })

  // Newsletter Templates
  await db.collection('newsletter_templates').createIndex({ tenantId: 1 }, { unique: true })

  // Collections
  await db.collection('collections').createIndex({ tenantId: 1, slug: 1 }, { unique: true })
  await db.collection('collections').createIndex({ tenantId: 1, isPublished: 1 })
  await db.collection('collections').createIndex({ tenantId: 1, isFeatured: 1 })
  await db.collection('collections').createIndex({ tenantId: 1, sortOrder: 1 })

  // Key Dates (Calendar)
  await db.collection('key_dates').createIndex({ tenantId: 1, date: 1 })
  await db.collection('key_dates').createIndex({ tenantId: 1, repeat: 1 })

  // Customers (extended indexes for auth)
  await db.collection('customers').createIndex({ tenantId: 1, email: 1 }, { unique: true })
  await db.collection('customers').createIndex({ verificationToken: 1 }, { sparse: true })
  await db.collection('customers').createIndex({ resetToken: 1 }, { sparse: true })
  await db.collection('customers').createIndex({ emailChangeToken: 1 }, { sparse: true })

  console.log('✅ Database indexes created')
}

// Utility function to serialize MongoDB documents
export function serializeMongo<T>(doc: any): T {
  if (!doc) return doc

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc
  return rest as T
}

// Utility function to serialize array of MongoDB documents
export function serializeMongoArray<T>(docs: any[]): T[] {
  return docs.map(doc => serializeMongo<T>(doc))
}
