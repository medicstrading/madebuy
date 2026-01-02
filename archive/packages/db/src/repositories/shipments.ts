import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Shipment,
  ShipmentStatus,
  CreateShipmentInput,
  ShipmentFilters,
  ShipmentTrackingEvent,
  ShipmentStats,
  ShippingCarrier,
  PaginationOptions,
} from '@madebuy/shared'

const COLLECTION = 'shipments'

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new shipment record
 */
export async function createShipment(
  tenantId: string,
  input: CreateShipmentInput | string,
  legacyData?: Omit<CreateShipmentInput, 'orderId'>
): Promise<Shipment> {
  const db = await getDatabase()
  const now = new Date()

  // Support legacy signature: createShipment(tenantId, orderId, data)
  let shipmentData: CreateShipmentInput
  if (typeof input === 'string') {
    shipmentData = {
      orderId: input,
      carrier: legacyData!.carrier,
      weight: legacyData!.weight,
      dimensions: legacyData!.dimensions,
    }
  } else {
    shipmentData = input
  }

  const shipment: Shipment = {
    id: nanoid(),
    tenantId,
    orderId: shipmentData.orderId,
    orderNumber: shipmentData.orderNumber,
    carrier: shipmentData.carrier,
    status: 'pending',
    statusUpdatedAt: now,
    package: shipmentData.package,
    senderAddress: shipmentData.senderAddress,
    recipientAddress: shipmentData.recipientAddress,
    shippingCost: shipmentData.shippingCost,
    sellerNotes: shipmentData.sellerNotes,
    trackingEvents: [],
    // Legacy fields for backwards compatibility
    weight: shipmentData.weight,
    dimensions: shipmentData.dimensions,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection(COLLECTION).insertOne(shipment)
  return shipment
}

// ============================================================================
// Read Operations
// ============================================================================

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
 * Get shipment by tracking number (public - no tenant required)
 * Used for public tracking pages
 */
export async function getShipmentByTracking(
  trackingNumber: string
): Promise<Shipment | null> {
  const db = await getDatabase()
  const result = await db.collection(COLLECTION).findOne({
    trackingNumber: trackingNumber.toUpperCase(),
  })
  return result as unknown as Shipment | null
}

/**
 * Alias for getShipmentByTracking (backwards compatibility)
 */
export const getShipmentByTrackingNumber = getShipmentByTracking

/**
 * Get shipment by carrier reference (e.g., Sendle order ID)
 */
export async function getShipmentByCarrierReference(
  carrierReference: string
): Promise<Shipment | null> {
  const db = await getDatabase()
  // Also check legacy sendleOrderId field
  const result = await db.collection(COLLECTION).findOne({
    $or: [
      { carrierReference },
      { sendleOrderId: carrierReference }
    ]
  })
  return result as unknown as Shipment | null
}

/**
 * Get shipment by Sendle order ID (for webhook handling)
 * Alias for getShipmentByCarrierReference
 */
export async function getShipmentBySendleOrderId(
  sendleOrderId: string
): Promise<Shipment | null> {
  return getShipmentByCarrierReference(sendleOrderId)
}

/**
 * List shipments with filters and pagination
 */
export async function listShipments(
  tenantId: string,
  filters?: ShipmentFilters,
  pagination?: PaginationOptions
): Promise<Shipment[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  // Status filter (single or array)
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status }
    } else {
      query.status = filters.status
    }
  }

  // Order ID filter (legacy)
  if (filters?.orderId) {
    query.orderId = filters.orderId
  }

  // Carrier filter
  if (filters?.carrier) {
    query.carrier = filters.carrier
  }

  // Date range filters
  const dateQuery: Record<string, Date> = {}
  const startDate = filters?.dateFrom || filters?.startDate
  const endDate = filters?.dateTo || filters?.endDate

  if (startDate) {
    dateQuery.$gte = startDate
  }
  if (endDate) {
    dateQuery.$lte = endDate
  }
  if (Object.keys(dateQuery).length > 0) {
    query.createdAt = dateQuery
  }

  // Search filter (order number or tracking number)
  if (filters?.search) {
    const searchRegex = { $regex: filters.search, $options: 'i' }
    query.$or = [
      { orderNumber: searchRegex },
      { trackingNumber: searchRegex },
    ]
  }

  // Apply pagination
  const limit = pagination?.limit ?? 100
  const offset = pagination?.offset ?? 0

  const results = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()

  return results as unknown as Shipment[]
}

/**
 * Get orders awaiting shipment (pending status)
 */
export async function getAwaitingShipment(tenantId: string): Promise<Shipment[]> {
  const db = await getDatabase()

  const results = await db
    .collection(COLLECTION)
    .find({
      tenantId,
      status: 'pending',
    })
    .sort({ createdAt: 1 }) // Oldest first
    .toArray()

  return results as unknown as Shipment[]
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
      status: { $in: ['booked', 'label_created'] },
    })
    .sort({ createdAt: 1 })
    .toArray()

  return results as unknown as Shipment[]
}

/**
 * Get recent shipments for a customer email (placeholder)
 */
export async function getShipmentsByCustomerEmail(
  _email: string,
  _limit: number = 10
): Promise<Shipment[]> {
  // Would need order lookup - placeholder for future implementation
  return []
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update shipment status with optional tracking event
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
  },
  trackingEvent?: Omit<ShipmentTrackingEvent, 'id'>
): Promise<Shipment | null> {
  const db = await getDatabase()
  const now = new Date()

  const updateData: Record<string, unknown> = {
    status,
    statusUpdatedAt: now,
    updatedAt: now,
    ...updates,
  }

  // Set timestamps based on status
  switch (status) {
    case 'booked':
    case 'label_created':
      updateData.labelGeneratedAt = now
      break
    case 'picked_up':
      updateData.pickedUpAt = now
      break
    case 'in_transit':
      if (!updates?.shippedAt) {
        updateData.shippedAt = now
      }
      break
    case 'out_for_delivery':
      updateData.outForDeliveryAt = now
      break
    case 'delivered':
      if (!updates?.deliveredAt) {
        updateData.deliveredAt = now
      }
      updateData.actualDelivery = updateData.deliveredAt
      break
    case 'failed':
      updateData.failedAt = now
      break
  }

  // Build update operation
  const updateOp: Record<string, unknown> = { $set: updateData }

  // Add tracking event if provided
  if (trackingEvent) {
    const event: ShipmentTrackingEvent = {
      id: nanoid(12),
      ...trackingEvent,
    }
    updateOp.$push = { trackingEvents: event }
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    updateOp,
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Add a tracking event to a shipment
 */
export async function addTrackingEvent(
  tenantId: string,
  shipmentId: string,
  event: Omit<ShipmentTrackingEvent, 'id'>
): Promise<Shipment | null> {
  const db = await getDatabase()

  const trackingEvent: ShipmentTrackingEvent = {
    id: nanoid(12),
    ...event,
  }

  // Prepare update data based on status
  const updateData: Record<string, unknown> = {
    status: event.status,
    statusUpdatedAt: new Date(),
    updatedAt: new Date(),
  }

  // Set relevant timestamp based on status
  switch (event.status) {
    case 'picked_up':
      updateData.pickedUpAt = event.timestamp
      break
    case 'in_transit':
      break // shippedAt might already be set
    case 'out_for_delivery':
      updateData.outForDeliveryAt = event.timestamp
      break
    case 'delivered':
      updateData.deliveredAt = event.timestamp
      updateData.actualDelivery = event.timestamp
      break
    case 'failed':
    case 'returned':
      updateData.failedAt = event.timestamp
      break
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: updateData,
      $push: { trackingEvents: trackingEvent },
    } as any, // MongoDB driver types are overly strict for $push operations
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Set tracking number and URL for a shipment
 */
export async function setTrackingNumber(
  tenantId: string,
  shipmentId: string,
  trackingNumber: string,
  trackingUrl?: string
): Promise<Shipment | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: {
        trackingNumber: trackingNumber.toUpperCase(),
        trackingUrl,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Set label URL for a shipment
 */
export async function setLabel(
  tenantId: string,
  shipmentId: string,
  labelUrl: string
): Promise<Shipment | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: {
        labelUrl,
        labelGeneratedAt: new Date(),
        updatedAt: new Date(),
      },
    },
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
    carrierReference?: string
  }
): Promise<Shipment | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: {
        trackingNumber: labelData.trackingNumber.toUpperCase(),
        trackingUrl: labelData.trackingUrl,
        labelUrl: labelData.labelUrl,
        sendleOrderId: labelData.sendleOrderId,
        carrierReference: labelData.carrierReference || labelData.sendleOrderId,
        status: 'booked' as ShipmentStatus,
        statusUpdatedAt: new Date(),
        labelGeneratedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Update estimated delivery date
 */
export async function updateEstimatedDelivery(
  tenantId: string,
  shipmentId: string,
  estimatedDeliveryDate?: Date,
  estimatedDeliveryRange?: [Date, Date]
): Promise<Shipment | null> {
  const db = await getDatabase()

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (estimatedDeliveryDate) {
    updateData.estimatedDeliveryDate = estimatedDeliveryDate
    updateData.estimatedDelivery = estimatedDeliveryDate
  }

  if (estimatedDeliveryRange) {
    updateData.estimatedDeliveryRange = estimatedDeliveryRange
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    { $set: updateData },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

/**
 * Alias for updateEstimatedDelivery
 */
export const setEstimatedDelivery = updateEstimatedDelivery

/**
 * Update shipment with carrier cost (for margin tracking)
 */
export async function setCarrierCost(
  tenantId: string,
  shipmentId: string,
  carrierCost: number
): Promise<Shipment | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: shipmentId },
    {
      $set: {
        carrierCost,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as unknown as Shipment | null
}

// ============================================================================
// Delete Operations
// ============================================================================

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

// ============================================================================
// Stats & Analytics
// ============================================================================

/**
 * Count shipments by status
 */
export async function countByStatus(
  tenantId: string
): Promise<Record<ShipmentStatus, number>> {
  const db = await getDatabase()

  const pipeline = [
    { $match: { tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]

  const results = await db.collection(COLLECTION).aggregate(pipeline).toArray()

  // Initialize all statuses to 0
  const counts: Record<ShipmentStatus, number> = {
    pending: 0,
    booked: 0,
    label_created: 0,
    picked_up: 0,
    in_transit: 0,
    out_for_delivery: 0,
    delivered: 0,
    failed: 0,
    returned: 0,
  }

  for (const result of results) {
    if (result._id in counts) {
      counts[result._id as ShipmentStatus] = result.count
    }
  }

  return counts
}

/**
 * Alias for countByStatus (backwards compatibility)
 */
export const countShipmentsByStatus = countByStatus

/**
 * Get shipment statistics for dashboard
 */
export async function getShipmentStats(tenantId: string): Promise<ShipmentStats> {
  const db = await getDatabase()

  // Get counts by status
  const statusCounts = await countByStatus(tenantId)

  // Get counts by carrier
  const carrierPipeline = [
    { $match: { tenantId } },
    { $group: { _id: '$carrier', count: { $sum: 1 } } },
  ]
  const carrierResults = await db.collection(COLLECTION).aggregate(carrierPipeline).toArray()

  const byCarrier: Partial<Record<ShippingCarrier, number>> = {}
  for (const result of carrierResults) {
    byCarrier[result._id as ShippingCarrier] = result.count
  }

  // Calculate average delivery time (for delivered shipments)
  const avgDeliveryPipeline = [
    {
      $match: {
        tenantId,
        status: 'delivered',
        shippedAt: { $exists: true },
        deliveredAt: { $exists: true },
      },
    },
    {
      $project: {
        deliveryDays: {
          $divide: [
            { $subtract: ['$deliveredAt', '$shippedAt'] },
            1000 * 60 * 60 * 24, // Convert ms to days
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgDays: { $avg: '$deliveryDays' },
      },
    },
  ]
  const avgDeliveryResult = await db.collection(COLLECTION).aggregate(avgDeliveryPipeline).toArray()
  const avgDeliveryDays = avgDeliveryResult[0]?.avgDays ?? 0

  // Calculate on-time delivery rate (delivered within estimated range)
  const deliveredWithEstimate = await db.collection(COLLECTION).countDocuments({
    tenantId,
    status: 'delivered',
    $or: [
      { estimatedDelivery: { $exists: true } },
      { estimatedDeliveryDate: { $exists: true } },
    ],
    deliveredAt: { $exists: true },
  })

  let onTimeDeliveries = 0
  if (deliveredWithEstimate > 0) {
    onTimeDeliveries = await db.collection(COLLECTION).countDocuments({
      tenantId,
      status: 'delivered',
      $or: [
        { $expr: { $lte: ['$deliveredAt', '$estimatedDelivery'] } },
        { $expr: { $lte: ['$deliveredAt', '$estimatedDeliveryDate'] } },
      ],
    })
  }

  const onTimeDeliveryRate = deliveredWithEstimate > 0
    ? Math.round((onTimeDeliveries / deliveredWithEstimate) * 100)
    : 100

  // Calculate revenue and costs
  const financialsPipeline = [
    { $match: { tenantId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ['$shippingCost', 0] } },
        totalCost: { $sum: { $ifNull: ['$carrierCost', 0] } },
      },
    },
  ]
  const financialsResult = await db.collection(COLLECTION).aggregate(financialsPipeline).toArray()

  return {
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    byStatus: statusCounts,
    byCarrier,
    avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10, // 1 decimal place
    onTimeDeliveryRate,
    totalShippingRevenue: financialsResult[0]?.totalRevenue ?? 0,
    totalCarrierCost: financialsResult[0]?.totalCost ?? 0,
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk update shipment statuses (e.g., from carrier webhook)
 */
export async function bulkUpdateStatus(
  updates: Array<{
    tenantId: string
    shipmentId: string
    status: ShipmentStatus
    trackingEvent?: Omit<ShipmentTrackingEvent, 'id'>
  }>
): Promise<number> {
  let updatedCount = 0

  for (const update of updates) {
    const result = await updateShipmentStatus(
      update.tenantId,
      update.shipmentId,
      update.status,
      undefined,
      update.trackingEvent
    )
    if (result) {
      updatedCount++
    }
  }

  return updatedCount
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Ensure indexes are created for optimal query performance
 * Call this on application startup
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()
  const collection = db.collection(COLLECTION)

  await Promise.all([
    // Primary indexes
    collection.createIndex({ tenantId: 1, id: 1 }, { unique: true }),
    collection.createIndex({ tenantId: 1, orderId: 1 }),
    collection.createIndex({ tenantId: 1, status: 1 }),
    collection.createIndex({ tenantId: 1, createdAt: -1 }),

    // Tracking lookups (no tenant for public tracking)
    collection.createIndex({ trackingNumber: 1 }, { sparse: true }),
    collection.createIndex({ carrierReference: 1 }, { sparse: true }),
    collection.createIndex({ sendleOrderId: 1 }, { sparse: true }), // Legacy

    // Combined filters
    collection.createIndex({ tenantId: 1, carrier: 1, status: 1 }),
  ])
}
