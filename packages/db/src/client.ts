import { createLogger } from '@madebuy/shared'
import { type Db, MongoClient } from 'mongodb'
import { ensureIndexes } from './indexes'

const logger = createLogger({ service: 'mongodb' })

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

if (!MONGODB_URI && process.env.NODE_ENV !== 'production') {
  logger.warn('MONGODB_URI environment variable not set')
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null
let indexesEnsured = false // Track if indexes have been created this process

export async function getDatabase(): Promise<Db> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  if (cachedDb) return cachedDb

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      // Connection pool settings optimized for persistent servers
      maxPoolSize: 10,
      minPoolSize: 2, // Keep 2 warm connections to avoid cold start
      maxIdleTimeMS: 120000, // Close idle connections after 2 minutes (was 30s)
      maxConnecting: 2,
      // Reliability settings
      retryWrites: true,
      retryReads: true,
      // Timeout settings
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    })
    await cachedClient.connect()
    logger.info({ database: MONGODB_DB }, 'Connected to MongoDB')
  }

  cachedDb = cachedClient.db(MONGODB_DB)

  // Only ensure indexes ONCE per process, and do it non-blocking
  // This prevents 200-500ms delay on every first request
  if (!indexesEnsured) {
    indexesEnsured = true
    // Capture db reference before setImmediate to satisfy TypeScript
    const db = cachedDb
    // Use setImmediate to ensure index creation doesn't block ANY request processing
    setImmediate(() => {
      ensureIndexes(db).catch((err) => {
        logger.error({ err }, 'Failed to ensure indexes')
        indexesEnsured = false // Allow retry on next connection
      })
    })
  }

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

// Utility function to serialize MongoDB documents
export function serializeMongo<T>(doc: any): T {
  if (!doc) return doc

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc
  return rest as T
}

// Utility function to serialize array of MongoDB documents
export function serializeMongoArray<T>(docs: any[]): T[] {
  return docs.map((doc) => serializeMongo<T>(doc))
}
