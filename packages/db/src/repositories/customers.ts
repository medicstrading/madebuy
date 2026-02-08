import type {
  CohortData,
  Customer,
  CustomerAddress,
  CustomerAuthResult,
  CustomerFilters,
  CustomerLTV,
  CustomerStats,
  CustomerWithOrders,
  PaginatedResult,
  PaginationParams,
  RegisterCustomerInput,
  UpdateCustomerInput,
} from '@madebuy/shared'
import {
  createLogger,
  DEFAULT_PASSWORD_REQUIREMENTS,
  validatePassword,
} from '@madebuy/shared'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const logger = createLogger({ service: 'customers' })

import { ObjectId } from 'mongodb'
import { getDatabase } from '../client'

const BCRYPT_ROUNDS = 10 // Reduced from 12 for faster login (~100ms vs ~400ms)
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24
const RESET_TOKEN_EXPIRY_HOURS = 24
const EMAIL_CHANGE_TOKEN_EXPIRY_HOURS = 24

// Dummy hash for timing attack prevention (cost 10 to match BCRYPT_ROUNDS)
const DUMMY_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

// Database record type for Customer collection
interface CustomerRecord extends Customer {
  _id?: unknown
}

// Aggregation result types
interface CustomerStatsAggResult {
  totalCustomers: number
  repeatCustomers: number
  totalRevenue: number
  totalOrders: number
  averageLTV: number
  averageOrderValue: number
}

interface TopCustomerRecord {
  id: string
  email: string
  name: string
  totalSpent: number
  totalOrders: number
}

interface AcquisitionSourceAggResult {
  _id: string
  customers: number
  revenue: number
}

/**
 * Create or update a customer from order data
 * Upserts based on email, updates stats on subsequent orders
 */
export async function createOrUpdateCustomer(
  tenantId: string,
  email: string,
  orderData: {
    customerName: string
    orderTotal: number
    acquisitionSource?: string
    acquisitionMedium?: string
    acquisitionCampaign?: string
  },
): Promise<Customer> {
  const db = await getDatabase()
  const now = new Date()

  const existing = await db.collection('customers').findOne({ tenantId, email })

  if (existing) {
    // Update existing customer
    const newTotalOrders = (existing.totalOrders || 0) + 1
    const newTotalSpent = (existing.totalSpent || 0) + orderData.orderTotal
    const newAverageOrderValue = newTotalSpent / newTotalOrders

    await db.collection('customers').updateOne(
      { tenantId, email },
      {
        $set: {
          name: orderData.customerName || existing.name,
          totalOrders: newTotalOrders,
          totalSpent: newTotalSpent,
          averageOrderValue: newAverageOrderValue,
          lastOrderAt: now,
          updatedAt: now,
        },
      },
    )

    return {
      ...existing,
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      averageOrderValue: newAverageOrderValue,
      lastOrderAt: now,
      updatedAt: now,
    } as unknown as Customer
  }

  // Create new customer
  const customer: Customer = {
    id: nanoid(),
    tenantId,
    email,
    name: orderData.customerName,
    addresses: [],
    totalOrders: 1,
    totalSpent: orderData.orderTotal,
    averageOrderValue: orderData.orderTotal,
    firstOrderAt: now,
    lastOrderAt: now,
    emailSubscribed: true, // Default to subscribed on first purchase
    emailSubscribedAt: now,
    acquisitionSource: orderData.acquisitionSource,
    acquisitionMedium: orderData.acquisitionMedium,
    acquisitionCampaign: orderData.acquisitionCampaign,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('customers').insertOne(customer)
  return customer
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(
  tenantId: string,
  email: string,
): Promise<Customer | null> {
  const db = await getDatabase()
  return (await db
    .collection('customers')
    .findOne({ tenantId, email })) as unknown as Customer | null
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  tenantId: string,
  id: string,
): Promise<Customer | null> {
  const db = await getDatabase()
  return (await db
    .collection('customers')
    .findOne({ tenantId, id })) as unknown as Customer | null
}

/**
 * List customers with filters
 */
export async function listCustomers(
  tenantId: string,
  filters?: CustomerFilters,
  pagination?: { page?: number; limit?: number } | PaginationParams,
): Promise<
  { customers: Customer[]; total: number } | PaginatedResult<Customer>
> {
  const db = await getDatabase()
  const query: Record<string, unknown> = { tenantId }

  if (filters?.minSpent) {
    query.totalSpent = { $gte: filters.minSpent }
  }
  if (filters?.maxSpent) {
    const existing = query.totalSpent as Record<string, unknown> | undefined
    query.totalSpent = { ...existing, $lte: filters.maxSpent }
  }
  if (filters?.minOrders) {
    query.totalOrders = { $gte: filters.minOrders }
  }
  if (filters?.emailSubscribed !== undefined) {
    query.emailSubscribed = filters.emailSubscribed
  }
  if (filters?.acquisitionSource) {
    query.acquisitionSource = filters.acquisitionSource
  }
  if (filters?.search) {
    // Escape regex special characters to prevent ReDoS attacks
    const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { email: { $regex: escapedSearch, $options: 'i' } },
      { name: { $regex: escapedSearch, $options: 'i' } },
    ]
  }

  // Check if using cursor-based pagination
  if (pagination && 'cursor' in pagination) {
    const limit = Math.min(pagination.limit || 50, 500)
    const sortBy = pagination.sortBy || 'totalSpent'
    const sortOrder = pagination.sortOrder || 'desc'

    // Add cursor condition to query
    if (pagination.cursor) {
      try {
        query._id = {
          [sortOrder === 'asc' ? '$gt' : '$lt']: new ObjectId(
            pagination.cursor,
          ),
        }
      } catch (e) {
        // Invalid cursor - ignore and start from beginning
      }
    }

    // Fetch limit + 1 to check if there are more items
    const items = (await db
      .collection('customers')
      .find(query)
      .sort({
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
        _id: sortOrder === 'asc' ? 1 : -1,
      })
      .limit(limit + 1)
      .toArray()) as unknown as Customer[]

    const hasMore = items.length > limit
    if (hasMore) {
      items.pop() // Remove the extra item
    }

    const nextCursor =
      hasMore && items.length > 0
        ? (items[items.length - 1] as any)._id.toString()
        : null

    return {
      data: items,
      nextCursor,
      hasMore,
    }
  }

  // Legacy page-based pagination for backward compatibility
  const page = (pagination as any)?.page || 1
  const limit = (pagination as any)?.limit || 50
  const skip = (page - 1) * limit

  const [customers, total] = await Promise.all([
    db
      .collection('customers')
      .find(query)
      .sort({ totalSpent: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('customers').countDocuments(query as Record<string, unknown>),
  ])

  return { customers: customers as unknown as Customer[], total }
}

/**
 * Update customer
 */
export async function updateCustomer(
  tenantId: string,
  id: string,
  updates: UpdateCustomerInput,
): Promise<void> {
  const db = await getDatabase()
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  }

  if (updates.emailSubscribed !== undefined) {
    if (updates.emailSubscribed) {
      updateData.emailSubscribedAt = new Date()
    } else {
      updateData.emailUnsubscribedAt = new Date()
    }
  }

  await db
    .collection('customers')
    .updateOne({ tenantId, id }, { $set: updateData })
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<CustomerStats> {
  const db = await getDatabase()
  const dateFilter: { $gte?: Date; $lte?: Date } = {}

  if (startDate) {
    dateFilter.$gte = startDate
  }
  if (endDate) {
    dateFilter.$lte = endDate
  }

  const matchQuery: Record<string, unknown> = { tenantId }
  if (Object.keys(dateFilter).length > 0) {
    matchQuery.createdAt = dateFilter
  }

  const [stats] = (await db
    .collection('customers')
    .aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0] },
          },
          totalRevenue: { $sum: '$totalSpent' },
          totalOrders: { $sum: '$totalOrders' },
        },
      },
      {
        $project: {
          _id: 0,
          totalCustomers: 1,
          repeatCustomers: 1,
          totalRevenue: 1,
          averageLTV: {
            $cond: [
              { $gt: ['$totalCustomers', 0] },
              { $divide: ['$totalRevenue', '$totalCustomers'] },
              0,
            ],
          },
          averageOrderValue: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $divide: ['$totalRevenue', '$totalOrders'] },
              0,
            ],
          },
        },
      },
    ])
    .toArray()) as CustomerStatsAggResult[]

  // Get new customers (first order within period)
  const newCustomersQuery: Record<string, unknown> = { tenantId }
  if (Object.keys(dateFilter).length > 0) {
    newCustomersQuery.firstOrderAt = dateFilter
  }
  const newCustomers = await db
    .collection('customers')
    .countDocuments(newCustomersQuery as Record<string, unknown>)

  // Get new customers this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const newCustomersThisMonth = await db
    .collection('customers')
    .countDocuments({ tenantId, firstOrderAt: { $gte: startOfMonth } })

  // Get top customers
  const topCustomersData = (await db
    .collection('customers')
    .find({ tenantId })
    .sort({ totalSpent: -1 })
    .limit(10)
    .toArray()) as unknown as TopCustomerRecord[]

  const topCustomers = topCustomersData.map((c) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    totalSpent: c.totalSpent || 0,
    orderCount: c.totalOrders || 0,
  }))

  return {
    totalCustomers: stats?.totalCustomers || 0,
    newCustomers,
    newCustomersThisMonth,
    repeatCustomers: stats?.repeatCustomers || 0,
    returningCustomers: stats?.repeatCustomers || 0, // Same as repeat for now
    averageLTV: stats?.averageLTV || 0,
    averageOrderValue: stats?.averageOrderValue || 0,
    totalRevenue: stats?.totalRevenue || 0,
    topCustomers,
  }
}

/**
 * Get top customers by LTV
 */
export async function getTopCustomers(
  tenantId: string,
  limit: number = 10,
): Promise<CustomerLTV[]> {
  const db = await getDatabase()
  const now = new Date()

  const customers = (await db
    .collection('customers')
    .find({ tenantId })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .toArray()) as CustomerRecord[]

  return customers.map((c) => {
    const daysSinceFirstOrder = c.firstOrderAt
      ? Math.floor(
          (now.getTime() - new Date(c.firstOrderAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0
    const daysSinceLastOrder = c.lastOrderAt
      ? Math.floor(
          (now.getTime() - new Date(c.lastOrderAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0

    // Simple LTV prediction based on order frequency and average value
    const ordersPerMonth =
      daysSinceFirstOrder > 0
        ? (c.totalOrders / daysSinceFirstOrder) * 30
        : c.totalOrders
    const predictedLTV =
      c.totalSpent + ordersPerMonth * c.averageOrderValue * 12

    return {
      customerId: c.id,
      email: c.email,
      name: c.name,
      lifetimeValue: c.totalSpent,
      predictedLTV,
      orderCount: c.totalOrders,
      avgOrderValue: c.averageOrderValue,
      daysSinceFirstOrder,
      daysSinceLastOrder,
    }
  })
}

/**
 * Get customer lifetime value
 */
export async function getCustomerLifetimeValue(
  tenantId: string,
  customerId: string,
): Promise<CustomerLTV | null> {
  const db = await getDatabase()
  const customer = await db
    .collection('customers')
    .findOne({ tenantId, id: customerId })

  if (!customer) return null

  const now = new Date()
  const daysSinceFirstOrder = Math.floor(
    (now.getTime() - new Date(customer.firstOrderAt).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  const daysSinceLastOrder = Math.floor(
    (now.getTime() - new Date(customer.lastOrderAt).getTime()) /
      (1000 * 60 * 60 * 24),
  )

  const ordersPerMonth =
    daysSinceFirstOrder > 0
      ? (customer.totalOrders / daysSinceFirstOrder) * 30
      : customer.totalOrders
  const predictedLTV =
    customer.totalSpent + ordersPerMonth * customer.averageOrderValue * 12

  return {
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    lifetimeValue: customer.totalSpent,
    predictedLTV,
    orderCount: customer.totalOrders,
    avgOrderValue: customer.averageOrderValue,
    daysSinceFirstOrder,
    daysSinceLastOrder,
  }
}

/**
 * Get cohort analysis by first purchase month
 */
export async function getCohortAnalysis(
  tenantId: string,
  months: number = 12,
): Promise<CohortData[]> {
  const db = await getDatabase()
  const now = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Get customers grouped by first order month
  const cohorts = await db
    .collection('customers')
    .aggregate([
      {
        $match: {
          tenantId,
          firstOrderAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$firstOrderAt' },
          },
          customers: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          avgOrderValue: { $avg: '$averageOrderValue' },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray()

  // For each cohort, calculate retention by month
  const cohortData: CohortData[] = []

  for (const cohort of cohorts) {
    const cohortMonth = cohort._id
    const cohortStart = new Date(`${cohortMonth}-01`)

    // Get order data for retention calculation
    const retentionData = await db
      .collection('orders')
      .aggregate([
        {
          $match: {
            tenantId,
            status: { $in: ['completed', 'delivered', 'shipped'] },
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerEmail',
            foreignField: 'email',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
        {
          $match: {
            'customer.tenantId': tenantId,
            'customer.firstOrderAt': {
              $gte: cohortStart,
              $lt: new Date(
                cohortStart.getFullYear(),
                cohortStart.getMonth() + 1,
                1,
              ),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$createdAt' },
            },
            uniqueCustomers: { $addToSet: '$customerEmail' },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray()

    const retention: number[] = []
    const revenue: number[] = []
    const totalCohortCustomers = cohort.customers

    // Calculate months since cohort start
    for (let i = 0; i <= months; i++) {
      const checkMonth = new Date(cohortStart)
      checkMonth.setMonth(checkMonth.getMonth() + i)
      const monthStr = checkMonth.toISOString().slice(0, 7)

      if (checkMonth > now) break

      const monthData = retentionData.find((r) => r._id === monthStr)
      if (monthData) {
        retention.push(
          Math.round(
            ((monthData.uniqueCustomers?.length || 0) / totalCohortCustomers) *
              100,
          ),
        )
        revenue.push(monthData.revenue || 0)
      } else {
        retention.push(0)
        revenue.push(0)
      }
    }

    cohortData.push({
      cohort: cohortMonth,
      customers: totalCohortCustomers,
      retention,
      revenue,
      avgOrderValue: cohort.avgOrderValue,
    })
  }

  return cohortData
}

/**
 * Get acquisition source breakdown
 */
export async function getAcquisitionSources(
  tenantId: string,
): Promise<{ source: string; customers: number; revenue: number }[]> {
  const db = await getDatabase()

  const sources = (await db
    .collection('customers')
    .aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: { $ifNull: ['$acquisitionSource', 'direct'] },
          customers: { $sum: 1 },
          revenue: { $sum: '$totalSpent' },
        },
      },
      { $sort: { revenue: -1 } },
    ])
    .toArray()) as AcquisitionSourceAggResult[]

  return sources.map((s) => ({
    source: s._id,
    customers: s.customers,
    revenue: s.revenue,
  }))
}

/**
 * Count total customers
 */
export async function countCustomers(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('customers').countDocuments({ tenantId })
}

/**
 * Export customers for CSV download
 */
export async function exportCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  const db = await getDatabase()
  const query: Record<string, unknown> = { tenantId }

  if (filters?.emailSubscribed !== undefined) {
    query.emailSubscribed = filters.emailSubscribed
  }
  if (filters?.minSpent) {
    query.totalSpent = { $gte: filters.minSpent }
  }

  return (await db
    .collection('customers')
    .find(query)
    .sort({ totalSpent: -1 })
    .toArray()) as unknown as Customer[]
}

// ============================================
// CUSTOMER AUTHENTICATION
// ============================================

export interface CustomerRegistrationResult {
  customer: Customer
  verificationToken: string
}

/**
 * Register a new customer with password
 * Creates account or upgrades existing guest customer to full account
 */
export async function registerCustomer(
  tenantId: string,
  input: RegisterCustomerInput,
): Promise<CustomerRegistrationResult> {
  const db = await getDatabase()
  const email = input.email.toLowerCase()
  const now = new Date()

  // Validate password strength
  const passwordValidation = validatePassword(
    input.password,
    DEFAULT_PASSWORD_REQUIREMENTS,
  )
  if (!passwordValidation.isValid) {
    throw new Error(
      passwordValidation.errors[0] || 'Password does not meet requirements',
    )
  }

  const verificationToken = nanoid(32)
  const verificationTokenExpiry = new Date()
  verificationTokenExpiry.setHours(
    verificationTokenExpiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS,
  )

  // Check if customer already exists
  const existing = await db.collection('customers').findOne({ tenantId, email })

  if (existing) {
    if (existing.passwordHash) {
      throw new Error('An account with this email already exists')
    }

    // Upgrade guest customer to full account
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    await db.collection('customers').updateOne(
      { tenantId, email },
      {
        $set: {
          name: input.name,
          phone: input.phone,
          passwordHash,
          emailVerified: false,
          verificationToken,
          verificationTokenExpiry,
          updatedAt: now,
        },
      },
    )

    const updated = await db
      .collection('customers')
      .findOne({ tenantId, email })
    return {
      customer: updated as unknown as Customer,
      verificationToken,
    }
  }

  // Create new customer with password
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  const customer: Customer = {
    id: nanoid(),
    tenantId,
    email,
    name: input.name,
    phone: input.phone,
    addresses: [],
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    emailSubscribed: true,
    emailSubscribedAt: now,
    passwordHash,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry,
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('customers').insertOne(customer)
  return { customer, verificationToken }
}

/**
 * Authenticate customer by email and password
 * Uses timing-attack safe comparison
 */
export async function authenticateCustomer(
  tenantId: string,
  email: string,
  password: string,
): Promise<CustomerAuthResult> {
  const db = await getDatabase()
  const customer = await db.collection('customers').findOne({
    tenantId,
    email: email.toLowerCase(),
  })

  // Always run bcrypt compare to prevent timing attacks
  const hashToCompare = customer?.passwordHash || DUMMY_HASH
  const isValid = await bcrypt.compare(password, hashToCompare)

  if (!customer || !customer.passwordHash || !isValid) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Update last login (fire-and-forget for faster response)
  db.collection('customers')
    .updateOne(
      { tenantId, id: customer.id },
      { $set: { lastLoginAt: new Date() } },
    )
    .catch((e) =>
      logger.error(
        { e, customerId: customer.id },
        'Failed to update lastLoginAt',
      ),
    )

  return { success: true, customer: customer as unknown as Customer }
}

/**
 * Verify customer email using token
 * Requires tenantId to prevent cross-tenant token usage
 */
export async function verifyCustomerEmail(
  tenantId: string,
  token: string,
): Promise<boolean> {
  const db = await getDatabase()

  const customer = await db.collection('customers').findOne({
    tenantId,
    verificationToken: token,
    verificationTokenExpiry: { $gt: new Date() },
  })

  if (!customer) return false

  await db.collection('customers').updateOne(
    { tenantId, id: customer.id },
    {
      $set: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: {
        verificationToken: '',
        verificationTokenExpiry: '',
      },
    },
  )

  return true
}

/**
 * Create new verification token (for resending)
 */
export async function createVerificationToken(
  tenantId: string,
  email: string,
): Promise<string | null> {
  const db = await getDatabase()
  const customer = await db.collection('customers').findOne({
    tenantId,
    email: email.toLowerCase(),
  })

  if (!customer || !customer.passwordHash || customer.emailVerified) {
    return null
  }

  const verificationToken = nanoid(32)
  const verificationTokenExpiry = new Date()
  verificationTokenExpiry.setHours(
    verificationTokenExpiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS,
  )

  await db.collection('customers').updateOne(
    { tenantId, id: customer.id },
    {
      $set: {
        verificationToken,
        verificationTokenExpiry,
        updatedAt: new Date(),
      },
    },
  )

  return verificationToken
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(
  tenantId: string,
  email: string,
): Promise<string | null> {
  const db = await getDatabase()
  const customer = await db.collection('customers').findOne({
    tenantId,
    email: email.toLowerCase(),
    passwordHash: { $exists: true },
  })

  if (!customer) return null

  const resetToken = nanoid(32)
  const resetTokenExpiry = new Date()
  resetTokenExpiry.setHours(
    resetTokenExpiry.getHours() + RESET_TOKEN_EXPIRY_HOURS,
  )

  await db.collection('customers').updateOne(
    { tenantId, id: customer.id },
    {
      $set: {
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      },
    },
  )

  return resetToken
}

/**
 * Reset password using token
 * Requires tenantId to prevent cross-tenant token usage
 */
export async function resetPassword(
  tenantId: string,
  token: string,
  newPassword: string,
): Promise<boolean> {
  // Validate password strength
  const passwordValidation = validatePassword(
    newPassword,
    DEFAULT_PASSWORD_REQUIREMENTS,
  )
  if (!passwordValidation.isValid) {
    throw new Error(
      passwordValidation.errors[0] || 'Password does not meet requirements',
    )
  }

  const db = await getDatabase()

  const customer = await db.collection('customers').findOne({
    tenantId,
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  })

  if (!customer) return false

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await db.collection('customers').updateOne(
    { tenantId, id: customer.id },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
      $unset: {
        resetToken: '',
        resetTokenExpiry: '',
      },
    },
  )

  return true
}

/**
 * Change customer password (requires current password)
 */
export async function changeCustomerPassword(
  tenantId: string,
  customerId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  // Validate new password strength
  const passwordValidation = validatePassword(
    newPassword,
    DEFAULT_PASSWORD_REQUIREMENTS,
  )
  if (!passwordValidation.isValid) {
    throw new Error(
      passwordValidation.errors[0] || 'Password does not meet requirements',
    )
  }

  const db = await getDatabase()
  const customer = await db
    .collection('customers')
    .findOne({ tenantId, id: customerId })

  if (!customer || !customer.passwordHash) return false

  const isValid = await bcrypt.compare(currentPassword, customer.passwordHash)
  if (!isValid) return false

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

  await db.collection('customers').updateOne(
    { tenantId, id: customerId },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    },
  )

  return true
}

// ============================================
// ADDRESS MANAGEMENT
// ============================================

/**
 * Add address to customer
 */
export async function addCustomerAddress(
  tenantId: string,
  customerId: string,
  address: Omit<CustomerAddress, 'id'>,
): Promise<Customer | null> {
  const db = await getDatabase()

  const newAddress: CustomerAddress = {
    ...address,
    id: nanoid(),
  }

  const result = await db.collection('customers').findOneAndUpdate(
    { tenantId, id: customerId },
    {
      $push: { addresses: newAddress } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Customer | null
}

/**
 * Update customer address
 */
export async function updateCustomerAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
  address: Partial<Omit<CustomerAddress, 'id'>>,
): Promise<Customer | null> {
  const db = await getDatabase()

  const updateFields: Record<string, unknown> = {}
  Object.keys(address).forEach((key) => {
    updateFields[`addresses.$.${key}`] = address[key as keyof typeof address]
  })

  const result = await db.collection('customers').findOneAndUpdate(
    { tenantId, id: customerId, 'addresses.id': addressId },
    {
      $set: { ...updateFields, updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Customer | null
}

/**
 * Remove customer address
 */
export async function removeCustomerAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
): Promise<Customer | null> {
  const db = await getDatabase()

  const result = await db.collection('customers').findOneAndUpdate(
    { tenantId, id: customerId },
    {
      $pull: { addresses: { id: addressId } } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Customer | null
}

/**
 * Set default address
 */
export async function setDefaultAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
): Promise<Customer | null> {
  const db = await getDatabase()

  // Unset any existing default
  await db
    .collection('customers')
    .updateOne(
      { tenantId, id: customerId },
      { $set: { 'addresses.$[].isDefault': false } },
    )

  // Set new default
  const result = await db.collection('customers').findOneAndUpdate(
    { tenantId, id: customerId, 'addresses.id': addressId },
    {
      $set: {
        'addresses.$.isDefault': true,
        defaultAddressId: addressId,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Customer | null
}

// ============================================
// EMAIL CHANGE
// ============================================

/**
 * Initiate email change - creates verification token
 */
export async function initiateEmailChange(
  tenantId: string,
  customerId: string,
  newEmail: string,
): Promise<string | null> {
  const db = await getDatabase()

  // Check if new email is already in use by this tenant
  const existing = await db.collection('customers').findOne({
    tenantId,
    email: newEmail.toLowerCase(),
  })
  if (existing) return null

  const emailChangeToken = nanoid(32)
  const emailChangeTokenExpiry = new Date()
  emailChangeTokenExpiry.setHours(
    emailChangeTokenExpiry.getHours() + EMAIL_CHANGE_TOKEN_EXPIRY_HOURS,
  )

  await db.collection('customers').updateOne(
    { tenantId, id: customerId },
    {
      $set: {
        pendingEmail: newEmail.toLowerCase(),
        emailChangeToken,
        emailChangeTokenExpiry,
        updatedAt: new Date(),
      },
    },
  )

  return emailChangeToken
}

/**
 * Confirm email change using token
 * Requires tenantId to prevent cross-tenant token usage
 */
export async function confirmEmailChange(
  tenantId: string,
  token: string,
): Promise<boolean> {
  const db = await getDatabase()

  const customer = await db.collection('customers').findOne({
    tenantId,
    emailChangeToken: token,
    emailChangeTokenExpiry: { $gt: new Date() },
  })

  if (!customer || !customer.pendingEmail) return false

  // Check that pending email isn't already taken
  const existing = await db.collection('customers').findOne({
    tenantId,
    email: customer.pendingEmail,
  })
  if (existing) {
    await db.collection('customers').updateOne(
      { tenantId, id: customer.id },
      {
        $unset: {
          pendingEmail: '',
          emailChangeToken: '',
          emailChangeTokenExpiry: '',
        },
        $set: { updatedAt: new Date() },
      },
    )
    return false
  }

  await db.collection('customers').updateOne(
    { tenantId, id: customer.id },
    {
      $set: {
        email: customer.pendingEmail,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: {
        pendingEmail: '',
        emailChangeToken: '',
        emailChangeTokenExpiry: '',
      },
    },
  )

  return true
}

// ============================================
// MARKETING & SUBSCRIPTIONS
// ============================================

/**
 * Get all customers subscribed to newsletter for a tenant
 */
export async function getSubscribedCustomers(
  tenantId: string,
): Promise<Customer[]> {
  const db = await getDatabase()

  const customers = await db
    .collection('customers')
    .find({ tenantId, emailSubscribed: true })
    .toArray()

  return customers as unknown as Customer[]
}

/**
 * Update email subscription preference
 */
export async function updateEmailSubscription(
  tenantId: string,
  customerId: string,
  subscribed: boolean,
): Promise<Customer | null> {
  const db = await getDatabase()
  const now = new Date()

  const updateData: Record<string, unknown> = {
    emailSubscribed: subscribed,
    updatedAt: now,
  }

  if (subscribed) {
    updateData.emailSubscribedAt = now
  }

  const result = await db
    .collection('customers')
    .findOneAndUpdate(
      { tenantId, id: customerId },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  return result as unknown as Customer | null
}

/**
 * Delete customer
 */
export async function deleteCustomer(
  tenantId: string,
  customerId: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db
    .collection('customers')
    .deleteOne({ tenantId, id: customerId })
  return result.deletedCount > 0
}

/**
 * Get customer with their orders
 */
interface OrderSummary {
  id: string
  orderNumber: string
  createdAt: Date
  total: number
  status: string
  paymentStatus: string
  items?: Array<unknown>
}

export async function getCustomerWithOrders(
  tenantId: string,
  customerId: string,
): Promise<CustomerWithOrders | null> {
  const db = await getDatabase()

  const customer = await db
    .collection('customers')
    .findOne({ tenantId, id: customerId })
  if (!customer) return null

  const orders = (await db
    .collection('orders')
    .find({ tenantId, customerEmail: customer.email })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as OrderSummary[]

  return {
    ...(customer as unknown as Customer),
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      itemCount: order.items?.length || 0,
    })),
  }
}
