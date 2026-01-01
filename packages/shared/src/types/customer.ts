/**
 * Customer Types
 * Customer data, segments, and LTV analytics
 */

export interface Customer {
  id: string
  tenantId: string
  email: string
  name: string

  // Stats
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  firstOrderAt: Date
  lastOrderAt: Date

  // Marketing
  emailSubscribed: boolean
  emailSubscribedAt?: Date

  // Attribution
  acquisitionSource?: string
  acquisitionMedium?: string
  acquisitionCampaign?: string

  createdAt: Date
  updatedAt: Date
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
}

export interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  averageLTV: number
  averageOrderValue: number
  totalRevenue: number
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

export interface CreateCustomerInput {
  email: string
  name: string
  acquisitionSource?: string
  acquisitionMedium?: string
  acquisitionCampaign?: string
  emailSubscribed?: boolean
}

export interface UpdateCustomerInput {
  name?: string
  emailSubscribed?: boolean
}
