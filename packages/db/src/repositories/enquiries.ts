import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Enquiry, CreateEnquiryInput } from '@madebuy/shared'

export async function createEnquiry(tenantId: string, data: CreateEnquiryInput): Promise<Enquiry> {
  const db = await getDatabase()

  const enquiry: Enquiry = {
    id: nanoid(),
    tenantId,
    name: data.name,
    email: data.email,
    message: data.message,
    pieceId: data.pieceId,
    pieceName: data.pieceName,
    source: data.source,
    sourceDomain: data.sourceDomain,
    // Traffic attribution
    trafficSource: data.trafficSource,
    trafficMedium: data.trafficMedium,
    trafficCampaign: data.trafficCampaign,
    landingPage: data.landingPage,
    sessionId: data.sessionId,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('enquiries').insertOne(enquiry)
  return enquiry
}

export async function getEnquiry(tenantId: string, id: string): Promise<Enquiry | null> {
  const db = await getDatabase()
  return await db.collection('enquiries').findOne({ tenantId, id }) as Enquiry | null
}

export async function listEnquiries(
  tenantId: string,
  filters?: {
    status?: Enquiry['status']
    pieceId?: string
  }
): Promise<Enquiry[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }

  const results = await db.collection('enquiries')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as any[]
}

export async function updateEnquiryStatus(
  tenantId: string,
  id: string,
  status: Enquiry['status']
): Promise<void> {
  const db = await getDatabase()
  await db.collection('enquiries').updateOne(
    { tenantId, id },
    {
      $set: {
        status,
        updatedAt: new Date(),
      }
    }
  )
}

export async function addEnquiryNote(
  tenantId: string,
  id: string,
  note: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection('enquiries').updateOne(
    { tenantId, id },
    {
      $set: {
        notes: note,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deleteEnquiry(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('enquiries').deleteOne({ tenantId, id })
}

export async function countEnquiries(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('enquiries').countDocuments({ tenantId })
}

/**
 * Ensure indexes exist (call on app startup)
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()

  await db.collection('enquiries').createIndex(
    { tenantId: 1, createdAt: -1 },
    { background: true }
  )
  await db.collection('enquiries').createIndex(
    { tenantId: 1, id: 1 },
    { unique: true, background: true }
  )
  await db.collection('enquiries').createIndex(
    { tenantId: 1, status: 1 },
    { background: true }
  )
  await db.collection('enquiries').createIndex(
    { tenantId: 1, pieceId: 1 },
    { background: true }
  )
  await db.collection('enquiries').createIndex(
    { tenantId: 1, trafficSource: 1 },
    { background: true }
  )
}
