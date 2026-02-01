import type {
  BookingFilters,
  CreateBookingInput,
  CreateSlotInput,
  CreateWorkshopInput,
  PaginatedResult,
  PaginationParams,
  UpdateBookingInput,
  UpdateSlotInput,
  UpdateWorkshopInput,
  Workshop,
  WorkshopBooking,
  WorkshopFilters,
  WorkshopSlot,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { cache } from '../cache'
import { getDatabase, serializeMongo, serializeMongoArray } from '../client'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

async function generateUniqueSlug(
  tenantId: string,
  name: string,
): Promise<string> {
  const db = await getDatabase()
  const baseSlug = generateSlug(name)

  // Check if base slug exists
  const existing = await db
    .collection('workshops')
    .findOne({ tenantId, slug: baseSlug })
  if (!existing) {
    return baseSlug
  }

  // Find all slugs that start with this base slug
  const similarSlugs = await db
    .collection('workshops')
    .find({ tenantId, slug: { $regex: `^${baseSlug}(-\\d+)?$` } })
    .project({ slug: 1 })
    .toArray()

  // Extract numbers from existing slugs
  const numbers = similarSlugs.map((doc) => {
    const match = (doc.slug as string).match(new RegExp(`^${baseSlug}-(\\d+)$`))
    return match ? parseInt(match[1], 10) : 1
  })

  // Generate next number
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 2
  return `${baseSlug}-${nextNum}`
}

// ============================================================================
// WORKSHOPS
// ============================================================================

export async function createWorkshop(
  tenantId: string,
  data: CreateWorkshopInput,
): Promise<Workshop> {
  const db = await getDatabase()

  // Generate unique slug
  const slug = await generateUniqueSlug(tenantId, data.name)

  const workshop: Workshop = {
    id: nanoid(),
    tenantId,
    name: data.name,
    slug,
    description: data.description,
    shortDescription: data.shortDescription,
    price: data.price,
    currency: data.currency || 'AUD',
    durationMinutes: data.durationMinutes,
    capacity: data.capacity,
    minCapacity: data.minCapacity,
    locationType: data.locationType,
    location: data.location,
    virtualMeetingUrl: data.virtualMeetingUrl,
    virtualInstructions: data.virtualInstructions,
    mediaIds: [],
    slots: [],
    status: data.status || 'draft',
    isPublishedToWebsite: false,
    category: data.category,
    tags: data.tags || [],
    requirements: data.requirements,
    skillLevel: data.skillLevel,
    cancellationPolicy: data.cancellationPolicy,
    refundPolicy: data.refundPolicy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('workshops').insertOne(workshop)

  // Invalidate cache
  cache.del(`workshops:${tenantId}:list`)

  return serializeMongo<Workshop>(workshop)
}

export async function getWorkshopById(
  tenantId: string,
  workshopId: string,
): Promise<Workshop | null> {
  const db = await getDatabase()
  const workshop = await db
    .collection('workshops')
    .findOne({ id: workshopId, tenantId })

  return workshop ? serializeMongo<Workshop>(workshop) : null
}

export async function getWorkshopBySlug(
  tenantId: string,
  slug: string,
): Promise<Workshop | null> {
  const db = await getDatabase()
  const workshop = await db.collection('workshops').findOne({ slug, tenantId })

  return workshop ? serializeMongo<Workshop>(workshop) : null
}

export async function updateWorkshop(
  tenantId: string,
  workshopId: string,
  data: UpdateWorkshopInput,
): Promise<Workshop | null> {
  const db = await getDatabase()

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  }

  // Generate new slug if name changed
  if (data.name) {
    const currentWorkshop = await getWorkshopById(tenantId, workshopId)
    if (currentWorkshop && currentWorkshop.name !== data.name) {
      updateData.slug = await generateUniqueSlug(tenantId, data.name)
    }
  }

  const result = await db
    .collection('workshops')
    .findOneAndUpdate(
      { id: workshopId, tenantId },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  if (result) {
    cache.del(`workshops:${tenantId}:list`)
    cache.del(`workshop:${workshopId}`)
  }

  return result ? serializeMongo<Workshop>(result) : null
}

export async function deleteWorkshop(
  tenantId: string,
  workshopId: string,
): Promise<boolean> {
  const db = await getDatabase()

  // Check if workshop has any confirmed bookings
  const hasBookings = await db.collection('workshop_bookings').findOne({
    tenantId,
    workshopId,
    status: { $in: ['confirmed', 'pending'] },
  })

  if (hasBookings) {
    throw new Error(
      'Cannot delete workshop with active bookings. Cancel all bookings first.',
    )
  }

  const result = await db.collection('workshops').deleteOne({
    id: workshopId,
    tenantId,
  })

  if (result.deletedCount > 0) {
    cache.del(`workshops:${tenantId}:list`)
    cache.del(`workshop:${workshopId}`)
  }

  return result.deletedCount > 0
}

export async function listWorkshops(
  tenantId: string,
  filters: WorkshopFilters = {},
  pagination?: PaginationParams,
): Promise<PaginatedResult<Workshop>> {
  const db = await getDatabase()

  // Build query
  const query: any = { tenantId }

  if (filters.status) {
    query.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status
  }

  if (filters.category) {
    query.category = filters.category
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags }
  }

  if (filters.locationType) {
    query.locationType = filters.locationType
  }

  if (filters.skillLevel) {
    query.skillLevel = filters.skillLevel
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { tags: { $regex: filters.search, $options: 'i' } },
    ]
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {}
    if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice
    if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice
  }

  if (filters.isPublishedToWebsite !== undefined) {
    query.isPublishedToWebsite = filters.isPublishedToWebsite
  }

  // Count total
  const total = await db.collection('workshops').countDocuments(query)

  // Build sort
  const sortField = pagination?.sortBy || 'createdAt'
  const sortOrder = pagination?.sortOrder === 'asc' ? 1 : -1
  const sort: [string, 1 | -1][] = [[sortField, sortOrder]]

  // Fetch data - use limit+1 to check hasMore
  const limit = pagination?.limit || 20

  const workshops = await db
    .collection('workshops')
    .find(query)
    .sort(sort)
    .limit(limit + 1)
    .toArray()

  const hasMore = workshops.length > limit
  const data = serializeMongoArray<Workshop>(workshops.slice(0, limit))
  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1].id : null

  return {
    data,
    nextCursor,
    hasMore,
    total,
  }
}

// ============================================================================
// SLOTS
// ============================================================================

export async function createSlot(
  tenantId: string,
  workshopId: string,
  data: CreateSlotInput,
): Promise<WorkshopSlot> {
  const db = await getDatabase()

  // Get workshop to check capacity
  const workshop = await getWorkshopById(tenantId, workshopId)
  if (!workshop) {
    throw new Error('Workshop not found')
  }

  const slot: WorkshopSlot = {
    id: nanoid(),
    workshopId,
    startTime: data.startTime,
    endTime: data.endTime,
    capacity: data.capacity || workshop.capacity,
    bookedCount: 0,
    status: 'available',
    priceOverride: data.priceOverride,
    notes: data.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Add slot to workshop's slots array
  await db.collection('workshops').updateOne(
    { id: workshopId, tenantId },
    {
      $push: { slots: slot } as any,
      $set: { updatedAt: new Date() },
    },
  )

  cache.del(`workshop:${workshopId}`)

  return slot
}

export async function updateSlot(
  tenantId: string,
  workshopId: string,
  slotId: string,
  data: UpdateSlotInput,
): Promise<WorkshopSlot | null> {
  const db = await getDatabase()

  const updateFields: any = {}
  if (data.startTime) updateFields['slots.$.startTime'] = data.startTime
  if (data.endTime) updateFields['slots.$.endTime'] = data.endTime
  if (data.capacity !== undefined)
    updateFields['slots.$.capacity'] = data.capacity
  if (data.priceOverride !== undefined)
    updateFields['slots.$.priceOverride'] = data.priceOverride
  if (data.notes !== undefined) updateFields['slots.$.notes'] = data.notes
  if (data.status) updateFields['slots.$.status'] = data.status
  updateFields['slots.$.updatedAt'] = new Date()

  const result = await db
    .collection('workshops')
    .findOneAndUpdate(
      { id: workshopId, tenantId, 'slots.id': slotId },
      { $set: updateFields },
      { returnDocument: 'after' },
    )

  if (result) {
    cache.del(`workshop:${workshopId}`)
    const workshop = serializeMongo<Workshop>(result)
    return workshop.slots.find((s) => s.id === slotId) || null
  }

  return null
}

export async function deleteSlot(
  tenantId: string,
  workshopId: string,
  slotId: string,
): Promise<boolean> {
  const db = await getDatabase()

  // Check if slot has any confirmed bookings
  const hasBookings = await db.collection('workshop_bookings').findOne({
    tenantId,
    workshopId,
    slotId,
    status: { $in: ['confirmed', 'pending'] },
  })

  if (hasBookings) {
    throw new Error(
      'Cannot delete slot with active bookings. Cancel all bookings first.',
    )
  }

  const result = await db.collection('workshops').updateOne(
    { id: workshopId, tenantId },
    {
      $pull: { slots: { id: slotId } } as any,
      $set: { updatedAt: new Date() },
    },
  )

  if (result.modifiedCount > 0) {
    cache.del(`workshop:${workshopId}`)
  }

  return result.modifiedCount > 0
}

export async function getAvailableSlots(
  tenantId: string,
  workshopId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<WorkshopSlot[]> {
  const workshop = await getWorkshopById(tenantId, workshopId)
  if (!workshop) return []

  let slots = workshop.slots.filter(
    (slot) => slot.status === 'available' && slot.bookedCount < slot.capacity,
  )

  // Filter by date range if provided
  if (startDate) {
    slots = slots.filter((slot) => new Date(slot.startTime) >= startDate)
  }
  if (endDate) {
    slots = slots.filter((slot) => new Date(slot.startTime) <= endDate)
  }

  // Sort by start time
  slots.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )

  return slots
}

// ============================================================================
// BOOKINGS
// ============================================================================

export async function createBooking(
  tenantId: string,
  data: CreateBookingInput,
): Promise<WorkshopBooking> {
  const db = await getDatabase()

  // Get workshop and slot
  const workshop = await getWorkshopById(tenantId, data.workshopId)
  if (!workshop) {
    throw new Error('Workshop not found')
  }

  const slot = workshop.slots.find((s) => s.id === data.slotId)
  if (!slot) {
    throw new Error('Slot not found')
  }

  // Check availability
  if (slot.status !== 'available') {
    throw new Error('Slot is not available')
  }

  if (slot.bookedCount + data.numberOfAttendees > slot.capacity) {
    throw new Error('Not enough capacity for this booking')
  }

  // Calculate pricing
  const pricePerPerson = slot.priceOverride || workshop.price
  const subtotal = pricePerPerson * data.numberOfAttendees
  const tax = 0 // TODO: Implement tax calculation
  const total = subtotal + tax

  const booking: WorkshopBooking = {
    id: nanoid(),
    tenantId,
    workshopId: data.workshopId,
    slotId: data.slotId,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    numberOfAttendees: data.numberOfAttendees,
    attendeeNames: data.attendeeNames,
    pricePerPerson,
    subtotal,
    tax,
    total,
    currency: workshop.currency,
    paymentStatus: 'pending',
    paymentMethod: 'stripe',
    status: 'pending',
    customerNotes: data.customerNotes,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('workshop_bookings').insertOne(booking)

  // Update slot booked count
  await db.collection('workshops').updateOne(
    { id: data.workshopId, tenantId, 'slots.id': data.slotId },
    {
      $inc: { 'slots.$.bookedCount': data.numberOfAttendees },
      $set: { updatedAt: new Date() },
    },
  )

  // Update slot status to full if at capacity
  const updatedWorkshop = await getWorkshopById(tenantId, data.workshopId)
  const updatedSlot = updatedWorkshop?.slots.find((s) => s.id === data.slotId)
  if (updatedSlot && updatedSlot.bookedCount >= updatedSlot.capacity) {
    await updateSlot(tenantId, data.workshopId, data.slotId, {
      status: 'full',
    })
  }

  cache.del(`workshop:${data.workshopId}`)

  return serializeMongo<WorkshopBooking>(booking)
}

export async function getBookingById(
  tenantId: string,
  bookingId: string,
): Promise<WorkshopBooking | null> {
  const db = await getDatabase()
  const booking = await db
    .collection('workshop_bookings')
    .findOne({ id: bookingId, tenantId })

  return booking ? serializeMongo<WorkshopBooking>(booking) : null
}

export async function updateBooking(
  tenantId: string,
  bookingId: string,
  data: UpdateBookingInput,
): Promise<WorkshopBooking | null> {
  const db = await getDatabase()

  const result = await db.collection('workshop_bookings').findOneAndUpdate(
    { id: bookingId, tenantId },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  return result ? serializeMongo<WorkshopBooking>(result) : null
}

export async function cancelBooking(
  tenantId: string,
  bookingId: string,
): Promise<WorkshopBooking | null> {
  const db = await getDatabase()

  const booking = await getBookingById(tenantId, bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }

  // Update booking status
  const result = await db.collection('workshop_bookings').findOneAndUpdate(
    { id: bookingId, tenantId },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  // Reduce slot booked count
  await db.collection('workshops').updateOne(
    { id: booking.workshopId, tenantId, 'slots.id': booking.slotId },
    {
      $inc: { 'slots.$.bookedCount': -booking.numberOfAttendees },
      $set: { updatedAt: new Date() },
    },
  )

  // Update slot status back to available if it was full
  const workshop = await getWorkshopById(tenantId, booking.workshopId)
  const slot = workshop?.slots.find((s) => s.id === booking.slotId)
  if (slot && slot.status === 'full' && slot.bookedCount < slot.capacity) {
    await updateSlot(tenantId, booking.workshopId, booking.slotId, {
      status: 'available',
    })
  }

  cache.del(`workshop:${booking.workshopId}`)

  return result ? serializeMongo<WorkshopBooking>(result) : null
}

export async function listBookings(
  tenantId: string,
  filters: BookingFilters = {},
  pagination?: PaginationParams,
): Promise<PaginatedResult<WorkshopBooking>> {
  const db = await getDatabase()

  // Build query
  const query: any = { tenantId }

  if (filters.workshopId) {
    query.workshopId = filters.workshopId
  }

  if (filters.slotId) {
    query.slotId = filters.slotId
  }

  if (filters.status) {
    query.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus
  }

  if (filters.customerEmail) {
    query.customerEmail = { $regex: filters.customerEmail, $options: 'i' }
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {}
    if (filters.startDate) query.createdAt.$gte = filters.startDate
    if (filters.endDate) query.createdAt.$lte = filters.endDate
  }

  // Count total
  const total = await db.collection('workshop_bookings').countDocuments(query)

  // Build sort
  const sortField = pagination?.sortBy || 'createdAt'
  const sortOrder = pagination?.sortOrder === 'asc' ? 1 : -1
  const sort: [string, 1 | -1][] = [[sortField, sortOrder]]

  // Fetch data - use limit+1 to check hasMore
  const limit = pagination?.limit || 20

  const bookings = await db
    .collection('workshop_bookings')
    .find(query)
    .sort(sort)
    .limit(limit + 1)
    .toArray()

  const hasMore = bookings.length > limit
  const data = serializeMongoArray<WorkshopBooking>(bookings.slice(0, limit))
  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1].id : null

  return {
    data,
    nextCursor,
    hasMore,
    total,
  }
}
