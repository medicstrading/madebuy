import type {
  CreateImportJobInput,
  ImportJob,
  UpdateImportJobInput,
} from '@madebuy/shared'
import { type Collection, ObjectId } from 'mongodb'
import { getDatabase } from '../client'

interface ImportJobDocument extends Omit<ImportJob, 'id'> {
  _id: ObjectId
}

async function getCollection(): Promise<Collection<ImportJobDocument>> {
  const db = await getDatabase()
  return db.collection<ImportJobDocument>('import_jobs')
}

function toImportJob(doc: ImportJobDocument): ImportJob {
  const { _id, ...rest } = doc
  return {
    id: _id.toHexString(),
    ...rest,
  }
}

/**
 * Create a new import job
 */
export async function createImportJob(
  input: CreateImportJobInput,
): Promise<ImportJob> {
  const collection = await getCollection()

  const doc: Omit<ImportJobDocument, '_id'> = {
    tenantId: input.tenantId,
    status: 'uploaded',
    source: input.source || 'madebuy',
    filename: input.filename,
    fileKey: input.fileKey,
    fileSize: input.fileSize,
    rowCount: 0,
    errors: [],
    warnings: [],
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    imagesDownloaded: 0,
    updateExisting: input.updateExisting ?? false,
    skipErrors: input.skipErrors ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await collection.insertOne(doc as ImportJobDocument)

  return {
    id: result.insertedId.toHexString(),
    ...doc,
  }
}

/**
 * Get an import job by ID
 */
export async function getImportJob(
  tenantId: string,
  jobId: string,
): Promise<ImportJob | null> {
  if (!ObjectId.isValid(jobId)) return null

  const collection = await getCollection()
  const doc = await collection.findOne({
    _id: new ObjectId(jobId),
    tenantId,
  })

  return doc ? toImportJob(doc) : null
}

/**
 * Update an import job
 */
export async function updateImportJob(
  tenantId: string,
  jobId: string,
  updates: UpdateImportJobInput,
): Promise<ImportJob | null> {
  if (!ObjectId.isValid(jobId)) return null

  const collection = await getCollection()

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(jobId), tenantId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  return result ? toImportJob(result) : null
}

/**
 * List import jobs for a tenant
 */
export async function listImportJobs(
  tenantId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ jobs: ImportJob[]; total: number }> {
  const collection = await getCollection()
  const { limit = 20, offset = 0 } = options

  const [docs, total] = await Promise.all([
    collection
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments({ tenantId }),
  ])

  return {
    jobs: docs.map(toImportJob),
    total,
  }
}

/**
 * Delete an import job
 */
export async function deleteImportJob(
  tenantId: string,
  jobId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(jobId)) return false

  const collection = await getCollection()
  const result = await collection.deleteOne({
    _id: new ObjectId(jobId),
    tenantId,
  })

  return result.deletedCount > 0
}

/**
 * Add errors to an import job
 */
export async function addImportErrors(
  tenantId: string,
  jobId: string,
  errors: ImportJob['errors'],
): Promise<void> {
  if (!ObjectId.isValid(jobId)) return

  const collection = await getCollection()
  await collection.updateOne(
    { _id: new ObjectId(jobId), tenantId },
    {
      $push: { errors: { $each: errors } },
      $set: { updatedAt: new Date() },
    },
  )
}

/**
 * Add warnings to an import job
 */
export async function addImportWarnings(
  tenantId: string,
  jobId: string,
  warnings: ImportJob['warnings'],
): Promise<void> {
  if (!ObjectId.isValid(jobId)) return

  const collection = await getCollection()
  await collection.updateOne(
    { _id: new ObjectId(jobId), tenantId },
    {
      $push: { warnings: { $each: warnings } },
      $set: { updatedAt: new Date() },
    },
  )
}

/**
 * Increment import counts
 */
export async function incrementImportCounts(
  tenantId: string,
  jobId: string,
  counts: {
    productsCreated?: number
    productsUpdated?: number
    productsSkipped?: number
    imagesDownloaded?: number
  },
): Promise<void> {
  if (!ObjectId.isValid(jobId)) return

  const collection = await getCollection()
  const $inc: Record<string, number> = {}

  if (counts.productsCreated) $inc.productsCreated = counts.productsCreated
  if (counts.productsUpdated) $inc.productsUpdated = counts.productsUpdated
  if (counts.productsSkipped) $inc.productsSkipped = counts.productsSkipped
  if (counts.imagesDownloaded) $inc.imagesDownloaded = counts.imagesDownloaded

  if (Object.keys($inc).length > 0) {
    await collection.updateOne(
      { _id: new ObjectId(jobId), tenantId },
      {
        $inc,
        $set: { updatedAt: new Date() },
      },
    )
  }
}
