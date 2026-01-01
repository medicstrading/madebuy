import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Shipment,
  ShipmentStatus,
  CreateShipmentInput,
  ShipmentDimensions,
} from '@madebuy/shared'

const COLLECTION = 'shipments'

export interface ShipmentFilters {
  status?: ShipmentStatus
  orderId?: string
  carrier?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Create a new shipment record
 */
export async function createShipment(
  tenantId: string,
  orderId: string,
  data: Omit<CreateShipmentInput, 'orderId'>
): Promise<Shipment> {
  const db = await getDatabase()

  const shipment: Shipment = {
    id: nanoid(),
    tenantId,
    orderId,
    carrier: data.carrier,
    status: 'pending',
    weight: data.weight,
    dimensions: data.dimensions,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(shipment)
  return shipment
}

/**
 * Get shipment by ID
 */
export async function getShipment(
  tenantId: string,
  shipmentId: string
): Promise<Shipment | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({ tenantId, id: shipmentId })
  return result as unknown as Shipment | null
}

/**
 * Get shipment by order ID
 */
export async function getShipmentByOrder(
  tenantId: string,
  orderId: string
): Promise<Shipment | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({ tenantId, orderId })
  return result as unknown as Shipment | null
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(
  tenantId: string,
  shipmentId: string,
  status: ShipmentStatus,
  updates?: {
    trackingNumber?: string
    trackingUrl?: string
    labelUrl?: string
    sendleOrderId?: string
    shippedAt?: Date
    deliveredAt?: Date
  }
): Promise<Shipment | null> {
  const db = await getDatabase()

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
    ...updates,
  }

  // Set timestamps based on status
  if (status === 'in_transit' && !updates?.shippedAt) {
    updateData.shippedAt = new Date()
  }

  if (status === 'delivered' && !updates?.deliveredAt) {
    updateData.deliveredAt = new Date()
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    { $set: updateData },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Update shipment with label info
 */
export async function updateShipmentLabel(
  tenantId: string,
  shipmentId: string,
  labelData: {
    trackingNumber: string
    trackingUrl: string
    labelUrl: string
    sendleOrderId?: string
  }
): Promise<Shipment | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: {
        ...labelData,
        status: 'label_created' as ShipmentStatus,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * List shipments with optional filters
 */
export async function listShipments(
  tenantId: string,
  filters?: ShipmentFilters
): Promise<Shipment[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.orderId) {
    query.orderId = filters.orderId
  }

  if (filters?.carrier) {
    query.carrier = filters.carrier
  }

  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {}
    if (filters.startDate) {
      (query.createdAt as Record<string, Date>).$gte = filters.startDate
    }
    if (filters.endDate) {
      (query.createdAt as Record<string, Date>).$lte = filters.endDate
    }
  }

  const results = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return results as unknown as Shipment[]
}

/**
 * Delete a shipment
 */
export async function deleteShipment(
  tenantId: string,
  shipmentId: string
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).deleteOne({ tenantId, id: shipmentId })
  return result.deletedCount > 0
}

/**
 * Count shipments by status
 */
export async function countShipmentsByStatus(
  tenantId: string
): Promise<Record<ShipmentStatus, number>> {
  const db = await getDatabase()

  const pipeline = [
    { $match: { tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]

  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray()

  const counts: Record<ShipmentStatus, number> = {
    pending: 0,
    label_created: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
  }

  for (const result of results) {
    if (result._id in counts) {
      counts[result._id as ShipmentStatus] = result.count
    }
  }

  return counts
}

/**
 * Get shipments pending pickup (labels created but not yet shipped)
 */
export async function getShipmentsPendingPickup(tenantId: string): Promise<Shipment[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      status: 'label_created',
    })
    .sort({ createdAt: 1 })
    .toArray()

  return results as unknown as Shipment[]
}
