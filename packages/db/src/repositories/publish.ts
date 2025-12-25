import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { PublishRecord } from '@madebuy/shared'

export async function createPublishRecord(
  tenantId: string,
  data: Omit<PublishRecord, 'id' | 'tenantId' | 'status' | 'results' | 'createdAt' | 'updatedAt'>
): Promise<PublishRecord> {
  const db = await getDatabase()

  const record: PublishRecord = {
    id: nanoid(),
    tenantId,
    mediaIds: data.mediaIds,
    pieceIds: data.pieceIds,
    caption: data.caption,
    hashtags: data.hashtags || [],
    platformCaptions: data.platformCaptions,
    platforms: data.platforms,
    scheduledFor: data.scheduledFor,
    status: data.scheduledFor ? 'scheduled' : 'draft',
    results: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('publish_records').insertOne(record)
  return record
}

export async function getPublishRecord(tenantId: string, id: string): Promise<PublishRecord | null> {
  const db = await getDatabase()
  return await db.collection('publish_records').findOne({ tenantId, id }) as PublishRecord | null
}

export async function listPublishRecords(
  tenantId: string,
  filters?: {
    status?: PublishRecord['status']
  }
): Promise<PublishRecord[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  const results = await db.collection('publish_records')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function getScheduledPublishRecords(tenantId: string): Promise<PublishRecord[]> {
  const db = await getDatabase()
  const now = new Date()

  const results = await db.collection('publish_records')
    .find({
      tenantId,
      status: 'scheduled',
      scheduledFor: { $lte: now }
    })
    .sort({ scheduledFor: 1 })
    .toArray()

  return results as any[]
}

export async function updatePublishRecordStatus(
  tenantId: string,
  id: string,
  status: PublishRecord['status']
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $set: {
        status,
        updatedAt: new Date(),
      }
    }
  )
}

export async function addPublishResult(
  tenantId: string,
  id: string,
  result: PublishRecord['results'][0]
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $push: { results: result as any },
      $set: { updatedAt: new Date() }
    }
  )
}

export async function updatePublishRecord(
  tenantId: string,
  id: string,
  updates: Partial<Omit<PublishRecord, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deletePublishRecord(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('publish_records').deleteOne({ tenantId, id })
}
