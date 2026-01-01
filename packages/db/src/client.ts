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
    cachedClient = new MongoClient(MONGODB_URI)
    await cachedClient.connect()
    console.log('✅ Connected to MongoDB')
  }

  cachedDb = cachedClient.db(MONGODB_DB)
  await ensureIndexes(cachedDb)

  return cachedDb
}

/**
 * Ensure all required indexes exist for multi-tenant security and performance
 * CRITICAL: All collections must be indexed by tenantId first!
 */
async function ensureIndexes(db: Db) {
  console.log('📑 Creating database indexes...')

  // Tenants
  await db.collection('tenants').createIndex({ email: 1 }, { unique: true })
  await db.collection('tenants').createIndex({ customDomain: 1 }, { sparse: true })

  // Pieces - ALWAYS filter by tenantId first
  await db.collection('pieces').createIndex({ tenantId: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, slug: 1 }, { unique: true })
  await db.collection('pieces').createIndex({ tenantId: 1, status: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, category: 1 })
  await db.collection('pieces').createIndex({ tenantId: 1, isFeatured: 1 })

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

  console.log('✅ Database indexes created')
}

// Utility function to serialize MongoDB documents
export function serializeMongo<T>(doc: any): T {
  if (!doc) return doc

  const { _id, ...rest } = doc
  return rest as T
}

// Utility function to serialize array of MongoDB documents
export function serializeMongoArray<T>(docs: any[]): T[] {
  return docs.map(doc => serializeMongo<T>(doc))
}
