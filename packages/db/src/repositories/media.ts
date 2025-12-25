import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { MediaItem, CreateMediaInput, UpdateMediaInput, MediaFilters } from '@madebuy/shared'

export async function createMedia(tenantId: string, data: CreateMediaInput): Promise<MediaItem> {
  const db = await getDatabase()

  const media: MediaItem = {
    id: nanoid(),
    tenantId,
    type: data.type,
    mimeType: data.mimeType,
    originalFilename: data.originalFilename,
    variants: data.variants,
    platformOptimized: data.platformOptimized || [],
    caption: data.caption,
    hashtags: data.hashtags || [],
    altText: data.altText,
    pieceId: data.pieceId,
    tags: data.tags || [],
    isFavorite: false,
    publishedTo: [],
    source: data.source || 'upload',
    importedFrom: data.importedFrom,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('media').insertOne(media)
  return media
}

export async function getMedia(tenantId: string, id: string): Promise<MediaItem | null> {
  const db = await getDatabase()
  return await db.collection('media').findOne({ tenantId, id }) as MediaItem | null
}

export async function listMedia(
  tenantId: string,
  filters?: MediaFilters
): Promise<MediaItem[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.type) {
    query.type = filters.type
  }

  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }

  if (filters?.isFavorite !== undefined) {
    query.isFavorite = filters.isFavorite
  }

  if (filters?.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags }
  }

  const results = await db.collection('media')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function updateMedia(
  tenantId: string,
  id: string,
  updates: UpdateMediaInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deleteMedia(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').deleteOne({ tenantId, id })
}

export async function getMediaByIds(tenantId: string, ids: string[]): Promise<MediaItem[]> {
  const db = await getDatabase()
  const results = await db.collection('media')
    .find({ tenantId, id: { $in: ids } })
    .toArray()

  return results as any[]
}

export async function addPublishDestination(
  tenantId: string,
  mediaId: string,
  destination: MediaItem['publishedTo'][0]
): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').updateOne(
    { tenantId, id: mediaId },
    {
      $addToSet: { publishedTo: destination },
      $set: { updatedAt: new Date() }
    }
  )
}

export async function countMedia(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('media').countDocuments({ tenantId })
}
