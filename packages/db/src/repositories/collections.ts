import type {
  Collection,
  CollectionListOptions,
  CreateCollectionInput,
  UpdateCollectionInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createCollection(
  tenantId: string,
  input: CreateCollectionInput,
): Promise<Collection> {
  const db = await getDatabase()

  const now = new Date()
  const collection: Collection = {
    id: nanoid(),
    tenantId,
    name: input.name,
    slug: input.slug || generateSlug(input.name),
    description: input.description,
    coverMediaId: input.coverMediaId,
    pieceIds: input.pieceIds || [],
    isPublished: input.isPublished || false,
    isFeatured: input.isFeatured || false,
    sortOrder: input.sortOrder || 0,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('collections').insertOne(collection)
  return collection
}

export async function getCollectionById(
  tenantId: string,
  id: string,
): Promise<Collection | null> {
  const db = await getDatabase()
  const collection = await db
    .collection('collections')
    .findOne({ tenantId, id })
  return collection as unknown as Collection | null
}

export async function getCollectionBySlug(
  tenantId: string,
  slug: string,
): Promise<Collection | null> {
  const db = await getDatabase()
  const collection = await db
    .collection('collections')
    .findOne({ tenantId, slug })
  return collection as unknown as Collection | null
}

export async function updateCollection(
  tenantId: string,
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection | null> {
  const db = await getDatabase()

  const updateData: any = {
    ...input,
    updatedAt: new Date(),
  }

  // Regenerate slug if name changed and no custom slug provided
  if (input.name && !input.slug) {
    const collection = await getCollectionById(tenantId, id)
    if (collection) {
      updateData.slug = generateSlug(input.name)
    }
  }

  const result = await db
    .collection('collections')
    .findOneAndUpdate(
      { tenantId, id },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  return result as unknown as Collection | null
}

export async function deleteCollection(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection('collections').deleteOne({ tenantId, id })
  return result.deletedCount === 1
}

export async function listCollections(
  tenantId: string,
  options: CollectionListOptions = {},
): Promise<{ items: Collection[]; total: number; hasMore: boolean }> {
  const db = await getDatabase()

  const filter: any = { tenantId }

  if (options.isPublished !== undefined) {
    filter.isPublished = options.isPublished
  }

  if (options.isFeatured !== undefined) {
    filter.isFeatured = options.isFeatured
  }

  const limit = options.limit || 50
  const offset = options.offset || 0
  const sortBy = options.sortBy || 'sortOrder'
  const sortOrder = options.sortOrder === 'desc' ? -1 : 1

  const [items, total] = await Promise.all([
    db
      .collection('collections')
      .find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection('collections').countDocuments(filter),
  ])

  return {
    items: items as unknown as Collection[],
    total,
    hasMore: offset + items.length < total,
  }
}

export async function listPublishedCollections(
  tenantId: string,
  limit = 20,
): Promise<Collection[]> {
  const result = await listCollections(tenantId, {
    isPublished: true,
    limit,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  })
  return result.items
}

export async function getFeaturedCollections(
  tenantId: string,
  limit = 6,
): Promise<Collection[]> {
  const result = await listCollections(tenantId, {
    isPublished: true,
    isFeatured: true,
    limit,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  })
  return result.items
}

export async function addPieceToCollection(
  tenantId: string,
  collectionId: string,
  pieceId: string,
): Promise<Collection | null> {
  const db = await getDatabase()

  const result = await db.collection('collections').findOneAndUpdate(
    { tenantId, id: collectionId },
    {
      $addToSet: { pieceIds: pieceId } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Collection | null
}

export async function removePieceFromCollection(
  tenantId: string,
  collectionId: string,
  pieceId: string,
): Promise<Collection | null> {
  const db = await getDatabase()

  const result = await db.collection('collections').findOneAndUpdate(
    { tenantId, id: collectionId },
    {
      $pull: { pieceIds: pieceId } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Collection | null
}

export async function getCollectionsForPiece(
  tenantId: string,
  pieceId: string,
): Promise<Collection[]> {
  const db = await getDatabase()

  const items = await db
    .collection('collections')
    .find({ tenantId, pieceIds: pieceId })
    .sort({ name: 1 })
    .toArray()

  return items as unknown as Collection[]
}

export async function countCollections(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return db.collection('collections').countDocuments({ tenantId })
}
