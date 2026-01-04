/**
 * Customer Types
 * Customer data, authentication, addresses, segments, and LTV analytics
 */

export interface Customer {
  id: string
  tenantId: string
  email: string
  name: string
  phone?: string

  // Contact preferences
  preferredContactMethod?: 'email' | 'phone' | 'sms'

  // Addresses
  addresses: CustomerAddress[]
  defaultAddressId?: string

  // Stats
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  firstOrderAt?: Date
  lastOrderAt?: Date

  // Marketing
  emailSubscribed: boolean
  emailSubscribedAt?: Date

  // Attribution
  acquisitionSource?: string
  acquisitionMedium?: string
  acquisitionCampaign?: string

  // Admin notes
  notes?: string
  tags?: string[]

  // External IDs
  stripeCustomerId?: string

  // Authentication (optional - only set if customer has account)
  passwordHash?: string
  emailVerified?: boolean
  emailVerifiedAt?: Date
  verificationToken?: string
  verificationTokenExpiry?: Date
  lastLoginAt?: Date
  resetToken?: string
  resetTokenExpiry?: Date

  // Email change verification
  pendingEmail?: string
  emailChangeToken?: string
  emailChangeTokenExpiry?: Date

  createdAt: Date
  updatedAt: Date
}

export interface CustomerAddress {
  id: string
  label?: string // e.g., "Home", "Work"
  line1: string
  line2?: string
  city: string
  state: string
  postcode: string
  country: string
  isDefault?: boolean
}

export interface CustomerSegment {
  id: string
  tenantId: string
  name: string
  description?: string
  rules: SegmentRule[]
  customerCount: number
  createdAt: Date
}

export interface SegmentRule {
  field: 'totalSpent' | 'totalOrders' | 'daysSinceLastOrder' | 'acquisitionSource'
  operator: 'gt' | 'lt' | 'eq' | 'contains'
  value: string | number
}

export interface CustomerFilters {
  segment?: string
  minSpent?: number
  maxSpent?: number
  minOrders?: number
  emailSubscribed?: boolean
  acquisitionSource?: string
  search?: string
  tag?: string
}

export interface CustomerListOptions {
  limit?: number
  offset?: number
  search?: string
  tag?: string
  emailSubscribed?: boolean
  sortBy?: 'name' | 'email' | 'createdAt' | 'totalSpent' | 'lastOrderAt' | 'totalOrders'
  sortOrder?: 'asc' | 'desc'
}

export interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  newCustomersThisMonth: number
  repeatCustomers: number
  returningCustomers: number
  averageLTV: number
  averageOrderValue: number
  totalRevenue: number
  topCustomers: {
    id: string
    email: string
    name: string
    totalSpent: number
    orderCount: number
  }[]
}

export interface CustomerLTV {
  customerId: string
  email: string
  name: string
  lifetimeValue: number
  predictedLTV: number
  orderCount: number
  avgOrderValue: number
  daysSinceFirstOrder: number
  daysSinceLastOrder: number
}

export interface CohortData {
  cohort: string // YYYY-MM format
  customers: number
  retention: number[]
  revenue: number[]
  avgOrderValue: number
}

export interface CustomerWithOrders extends Customer {
  orders: {
    id: string
    orderNumber: string
    createdAt: Date
    total: number
    status: string
    paymentStatus: string
    itemCount: number
  }[]
}

export interface CreateCustomerInput {
  email: string
  name: string
  phone?: string
  preferredContactMethod?: 'email' | 'phone' | 'sms'
  addresses?: Omit<CustomerAddress, 'id'>[]
  acquisitionSource?: string
  acquisitionMedium?: string
  acquisitionCampaign?: string
  emailSubscribed?: boolean
  notes?: string
  tags?: string[]
  stripeCustomerId?: string
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string
  preferredContactMethod?: 'email' | 'phone' | 'sms'
  emailSubscribed?: boolean
  notes?: string
  tags?: string[]
  stripeCustomerId?: string
}

export interface RegisterCustomerInput {
  email: string
  name: string
  password: string
  phone?: string
}

export interface CustomerAuthResult {
  success: boolean
  customer?: Customer
  error?: string
}
