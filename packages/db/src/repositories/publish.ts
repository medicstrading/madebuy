import type {
  CreatePublishInput,
  PublishRecord,
  RecurrenceConfig,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

export async function createPublishRecord(
  tenantId: string,
  data: CreatePublishInput,
): Promise<PublishRecord> {
  const db = await getDatabase()

  // Build recurrence config if provided
  let recurrence: RecurrenceConfig | undefined
  if (data.recurrence?.enabled) {
    recurrence = {
      ...data.recurrence,
      completedOccurrences: 0,
      childRecordIds: [],
    }
  }

  const record: PublishRecord = {
    id: nanoid(),
    tenantId,
    mediaIds: data.mediaIds,
    pieceIds: data.pieceIds,
    caption: data.caption,
    hashtags: data.hashtags || [],
    platformCaptions: data.platformCaptions,
    blogConfig: data.blogConfig,
    platforms: data.platforms,
    scheduledFor: data.scheduledFor,
    status: data.scheduledFor ? 'scheduled' : 'draft',
    results: [],
    recurrence,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('publish_records').insertOne(record)
  return record
}

export async function getPublishRecord(
  tenantId: string,
  id: string,
): Promise<PublishRecord | null> {
  const db = await getDatabase()
  return (await db
    .collection('publish_records')
    .findOne({ tenantId, id })) as PublishRecord | null
}

export async function listPublishRecords(
  tenantId: string,
  filters?: {
    status?: PublishRecord['status']
  },
): Promise<PublishRecord[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  const results = await db
    .collection('publish_records')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function getScheduledPublishRecords(
  tenantId: string,
): Promise<PublishRecord[]> {
  const db = await getDatabase()
  const now = new Date()

  const results = await db
    .collection('publish_records')
    .find({
      tenantId,
      status: 'scheduled',
      scheduledFor: { $lte: now },
    })
    .sort({ scheduledFor: 1 })
    .toArray()

  return results as any[]
}

export async function updatePublishRecordStatus(
  tenantId: string,
  id: string,
  status: PublishRecord['status'],
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  )
}

export async function addPublishResult(
  tenantId: string,
  id: string,
  result: PublishRecord['results'][0],
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $push: { results: result as any },
      $set: { updatedAt: new Date() },
    },
  )
}

export async function updatePublishRecord(
  tenantId: string,
  id: string,
  updates: Partial<Omit<PublishRecord, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
  )
}

export async function deletePublishRecord(
  tenantId: string,
  id: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').deleteOne({ tenantId, id })
}

// --- Recurrence functions ---

/**
 * Get a publish record by ID with tenant isolation
 */
export async function getPublishRecordById(
  tenantId: string,
  id: string,
): Promise<PublishRecord | null> {
  const db = await getDatabase()
  return (await db
    .collection('publish_records')
    .findOne({ tenantId, id })) as PublishRecord | null
}

/**
 * Calculate the next scheduled time based on recurrence config
 */
function calculateNextScheduledTime(
  baseTime: Date,
  intervalValue: number,
  intervalUnit: RecurrenceConfig['intervalUnit'],
): Date {
  const next = new Date(baseTime)
  switch (intervalUnit) {
    case 'hours':
      next.setHours(next.getHours() + intervalValue)
      break
    case 'days':
      next.setDate(next.getDate() + intervalValue)
      break
    case 'weeks':
      next.setDate(next.getDate() + intervalValue * 7)
      break
  }
  return next
}

/**
 * Create the next occurrence of a recurring post
 */
export async function createNextOccurrence(
  parentRecord: PublishRecord,
): Promise<PublishRecord | null> {
  if (!parentRecord.recurrence?.enabled) return null
  if (!parentRecord.scheduledFor) return null

  const { recurrence } = parentRecord

  // Check if we've reached the total occurrences
  if (recurrence.completedOccurrences >= recurrence.totalOccurrences - 1) {
    return null
  }

  // Calculate next scheduled time
  const nextScheduledFor = calculateNextScheduledTime(
    parentRecord.scheduledFor,
    recurrence.intervalValue,
    recurrence.intervalUnit,
  )

  const db = await getDatabase()

  // Create child record
  const childRecord: PublishRecord = {
    id: nanoid(),
    tenantId: parentRecord.tenantId,
    mediaIds: parentRecord.mediaIds,
    pieceIds: parentRecord.pieceIds,
    caption: parentRecord.caption,
    hashtags: parentRecord.hashtags,
    platformCaptions: parentRecord.platformCaptions,
    blogConfig: parentRecord.blogConfig,
    platforms: parentRecord.platforms,
    scheduledFor: nextScheduledFor,
    status: 'scheduled',
    results: [],
    recurrence: {
      ...recurrence,
      parentRecordId: parentRecord.id,
      childRecordIds: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('publish_records').insertOne(childRecord)

  // Link child to parent
  await linkChildToParent(parentRecord.id, childRecord.id)

  return childRecord
}

/**
 * Update recurrence progress (increment completedOccurrences)
 */
export async function updateRecurrenceProgress(
  recordId: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { id: recordId },
    {
      $inc: { 'recurrence.completedOccurrences': 1 },
      $set: { updatedAt: new Date() },
    },
  )
}

/**
 * Link a child record to its parent
 */
export async function linkChildToParent(
  parentId: string,
  childId: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { id: parentId },
    {
      $push: { 'recurrence.childRecordIds': childId as any },
      $set: { updatedAt: new Date() },
    },
  )
}
