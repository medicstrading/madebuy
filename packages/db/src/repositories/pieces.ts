import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Piece, CreatePieceInput, UpdatePieceInput, PieceFilters } from '@madebuy/shared'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function createPiece(tenantId: string, data: CreatePieceInput): Promise<Piece> {
  const db = await getDatabase()

  const piece: Piece = {
    id: nanoid(),
    tenantId,
    name: data.name,
    slug: generateSlug(data.name),
    description: data.description,
    // Generic materials (new field)
    materials: data.materials || [],
    techniques: data.techniques || [],
    // Legacy fields (kept for migration)
    stones: data.stones || [],
    metals: data.metals || [],
    dimensions: data.dimensions,
    weight: data.weight,
    chainLength: data.chainLength,
    price: data.price,
    currency: data.currency || 'AUD',
    cogs: undefined,
    status: data.status || 'draft',
    mediaIds: [],
    isFeatured: data.isFeatured || false,
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    isPublishedToWebsite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('pieces').insertOne(piece)
  return piece
}

export async function getPiece(tenantId: string, id: string): Promise<Piece | null> {
  const db = await getDatabase()
  return await db.collection('pieces').findOne({ tenantId, id }) as Piece | null
}

export async function getPieceBySlug(tenantId: string, slug: string): Promise<Piece | null> {
  const db = await getDatabase()
  return await db.collection('pieces').findOne({ tenantId, slug }) as Piece | null
}

export async function listPieces(tenantId: string, filters?: PieceFilters): Promise<Piece[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.category) {
    query.category = filters.category
  }

  if (filters?.isFeatured !== undefined) {
    query.isFeatured = filters.isFeatured
  }

  if (filters?.isPublishedToWebsite !== undefined) {
    query.isPublishedToWebsite = filters.isPublishedToWebsite
  }

  const results = await db.collection('pieces')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function updatePiece(
  tenantId: string,
  id: string,
  updates: UpdatePieceInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deletePiece(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').deleteOne({ tenantId, id })
}

export async function addMediaToPiece(tenantId: string, pieceId: string, mediaId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $addToSet: { mediaIds: mediaId },
      $set: { updatedAt: new Date() }
    }
  )
}

export async function removeMediaFromPiece(tenantId: string, pieceId: string, mediaId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $pull: { mediaIds: mediaId } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

export async function countPieces(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('pieces').countDocuments({ tenantId })
}

export async function findPiecesByEtsyListingId(listingId: string): Promise<Piece[]> {
  const db = await getDatabase()
  return await db.collection('pieces')
    .find({ 'integrations.etsy.listingId': listingId })
    .toArray() as any[]
}
