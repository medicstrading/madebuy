/**
 * Workshop - Service/class booking system for makers
 */

export interface Workshop {
  id: string
  tenantId: string

  // Basic info
  name: string
  slug: string // URL-safe version
  description: string
  shortDescription?: string // Brief summary for listings

  // Pricing
  price: number // Price per person in cents
  currency: string

  // Duration & capacity
  durationMinutes: number // Total duration in minutes
  capacity: number // Max attendees per session
  minCapacity?: number // Minimum attendees required to run (optional)

  // Location
  locationType: 'physical' | 'virtual' | 'hybrid'
  location?: {
    name?: string // Venue name
    address?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  virtualMeetingUrl?: string // Zoom/Meet link (revealed after booking)
  virtualInstructions?: string // How to join virtual session

  // Media
  mediaIds: string[]
  primaryMediaId?: string

  // Schedule
  slots: WorkshopSlot[] // Available time slots

  // Status
  status: 'draft' | 'published' | 'archived'
  isPublishedToWebsite: boolean

  // Category & tags
  category?: string
  tags: string[]

  // Prerequisites & requirements
  requirements?: string // What customers need to bring/know
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'

  // Cancellation policy
  cancellationPolicy?: string
  refundPolicy?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * WorkshopSlot - A specific time slot for a workshop
 */
export interface WorkshopSlot {
  id: string
  workshopId: string

  // Schedule
  startTime: Date
  endTime: Date

  // Capacity tracking
  capacity: number // Override workshop capacity if needed
  bookedCount: number // Current bookings

  // Availability
  status: 'available' | 'full' | 'cancelled'

  // Pricing override (optional)
  priceOverride?: number // Override base workshop price for special dates

  // Notes
  notes?: string // Internal notes about this slot

  createdAt: Date
  updatedAt: Date
}

/**
 * WorkshopBooking - Customer reservation for a workshop slot
 */
export interface WorkshopBooking {
  id: string
  tenantId: string
  workshopId: string
  slotId: string

  // Customer info
  customerEmail: string
  customerName: string
  customerPhone?: string

  // Attendees
  numberOfAttendees: number
  attendeeNames?: string[] // Optional names of all attendees

  // Pricing
  pricePerPerson: number // Snapshot at booking time
  subtotal: number // numberOfAttendees * pricePerPerson
  tax: number
  total: number
  currency: string

  // Payment
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: 'stripe'
  stripeSessionId?: string
  stripePaymentIntentId?: string

  // Fee breakdown (all amounts in cents)
  fees?: {
    stripe: number
    platform: number // Always 0 for MadeBuy
    total: number
  }
  netAmount?: number // What seller receives

  // Refund tracking
  refundedAmount?: number
  refundedAt?: Date
  refundId?: string
  refundReason?: string

  // Status
  status:
    | 'pending'
    | 'confirmed'
    | 'attended'
    | 'no_show'
    | 'cancelled'
    | 'refunded'

  // Communication
  customerNotes?: string // Customer's message/questions
  adminNotes?: string // Internal notes
  confirmationSentAt?: Date
  reminderSentAt?: Date

  // Timestamps
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  cancelledAt?: Date
}

/**
 * CreateWorkshopInput
 */
export interface CreateWorkshopInput {
  name: string
  description: string
  shortDescription?: string
  price: number
  currency?: string
  durationMinutes: number
  capacity: number
  minCapacity?: number
  locationType: 'physical' | 'virtual' | 'hybrid'
  location?: Workshop['location']
  virtualMeetingUrl?: string
  virtualInstructions?: string
  category?: string
  tags?: string[]
  requirements?: string
  skillLevel?: Workshop['skillLevel']
  cancellationPolicy?: string
  refundPolicy?: string
  status?: 'draft' | 'published'
}

/**
 * UpdateWorkshopInput
 */
export interface UpdateWorkshopInput {
  name?: string
  description?: string
  shortDescription?: string
  price?: number
  currency?: string
  durationMinutes?: number
  capacity?: number
  minCapacity?: number
  locationType?: 'physical' | 'virtual' | 'hybrid'
  location?: Workshop['location']
  virtualMeetingUrl?: string
  virtualInstructions?: string
  category?: string
  tags?: string[]
  requirements?: string
  skillLevel?: Workshop['skillLevel']
  cancellationPolicy?: string
  refundPolicy?: string
  mediaIds?: string[]
  primaryMediaId?: string
  isPublishedToWebsite?: boolean
  slug?: string
  status?: Workshop['status']
}

/**
 * CreateSlotInput
 */
export interface CreateSlotInput {
  startTime: Date
  endTime: Date
  capacity?: number // Optional override
  priceOverride?: number
  notes?: string
}

/**
 * UpdateSlotInput
 */
export interface UpdateSlotInput {
  startTime?: Date
  endTime?: Date
  capacity?: number
  priceOverride?: number
  notes?: string
  status?: WorkshopSlot['status']
}

/**
 * CreateBookingInput
 */
export interface CreateBookingInput {
  workshopId: string
  slotId: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  numberOfAttendees: number
  attendeeNames?: string[]
  customerNotes?: string
}

/**
 * UpdateBookingInput
 */
export interface UpdateBookingInput {
  status?: WorkshopBooking['status']
  paymentStatus?: WorkshopBooking['paymentStatus']
  adminNotes?: string
}

/**
 * WorkshopFilters
 */
export interface WorkshopFilters {
  status?: Workshop['status'] | Workshop['status'][]
  category?: string
  tags?: string[]
  locationType?: Workshop['locationType']
  skillLevel?: Workshop['skillLevel']
  search?: string
  minPrice?: number
  maxPrice?: number
  isPublishedToWebsite?: boolean
}

/**
 * WorkshopListOptions
 */
export interface WorkshopListOptions extends WorkshopFilters {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name'
  sortOrder?: 'asc' | 'desc'
}

/**
 * BookingFilters
 */
export interface BookingFilters {
  workshopId?: string
  slotId?: string
  status?: WorkshopBooking['status'] | WorkshopBooking['status'][]
  paymentStatus?: WorkshopBooking['paymentStatus']
  customerEmail?: string
  startDate?: Date
  endDate?: Date
}
