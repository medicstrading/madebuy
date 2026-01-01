import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Customer,
  CustomerFilters,
  CustomerStats,
  CustomerLTV,
  CohortData,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@madebuy/shared'

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
  }
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
      }
    )

    return {
      ...existing,
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      averageOrderValue: newAverageOrderValue,
      lastOrderAt: now,
      updatedAt: now,
    } as Customer
  }

  // Create new customer
  const customer: Customer = {
    id: nanoid(),
    tenantId,
    email,
    name: orderData.customerName,
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
  email: string
): Promise<Customer | null> {
  const db = await getDatabase()
  return (await db.collection('customers').findOne({ tenantId, email })) as Customer | null
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  tenantId: string,
  id: string
): Promise<Customer | null> {
  const db = await getDatabase()
  return (await db.collection('customers').findOne({ tenantId, id })) as Customer | null
}

/**
 * List customers with filters
 */
export async function listCustomers(
  tenantId: string,
  filters?: CustomerFilters,
  pagination?: { page?: number; limit?: number }
): Promise<{ customers: Customer[]; total: number }> {
  const db = await getDatabase()
  const query: any = { tenantId }

  if (filters?.minSpent) {
    query.totalSpent = { $gte: filters.minSpent }
  }
  if (filters?.maxSpent) {
    query.totalSpent = { ...query.totalSpent, $lte: filters.maxSpent }
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
    query.$or = [
      { email: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
    ]
  }

  const page = pagination?.page || 1
  const limit = pagination?.limit || 50
  const skip = (page - 1) * limit

  const [customers, total] = await Promise.all([
    db
      .collection('customers')
      .find(query)
      .sort({ totalSpent: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('customers').countDocuments(query),
  ])

  return { customers: customers as Customer[], total }
}

/**
 * Update customer
 */
export async function updateCustomer(
  tenantId: string,
  id: string,
  updates: UpdateCustomerInput
): Promise<void> {
  const db = await getDatabase()
  const updateData: any = { ...updates, updatedAt: new Date() }

  if (updates.emailSubscribed !== undefined) {
    if (updates.emailSubscribed) {
      updateData.emailSubscribedAt = new Date()
    } else {
      updateData.emailUnsubscribedAt = new Date()
    }
  }

  await db.collection('customers').updateOne({ tenantId, id }, { $set: updateData })
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CustomerStats> {
  const db = await getDatabase()
  const dateFilter: any = {}

  if (startDate) {
    dateFilter.$gte = startDate
  }
  if (endDate) {
    dateFilter.$lte = endDate
  }

  const matchQuery: any = { tenantId }
  if (Object.keys(dateFilter).length > 0) {
    matchQuery.createdAt = dateFilter
  }

  const [stats] = await db
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
    .toArray()

  // Get new customers (first order within period)
  const newCustomersQuery: any = { tenantId }
  if (Object.keys(dateFilter).length > 0) {
    newCustomersQuery.firstOrderAt = dateFilter
  }
  const newCustomers = await db
    .collection('customers')
    .countDocuments(newCustomersQuery)

  return {
    totalCustomers: stats?.totalCustomers || 0,
    newCustomers,
    repeatCustomers: stats?.repeatCustomers || 0,
    averageLTV: stats?.averageLTV || 0,
    averageOrderValue: stats?.averageOrderValue || 0,
    totalRevenue: stats?.totalRevenue || 0,
  }
}

/**
 * Get top customers by LTV
 */
export async function getTopCustomers(
  tenantId: string,
  limit: number = 10
): Promise<CustomerLTV[]> {
  const db = await getDatabase()
  const now = new Date()

  const customers = await db
    .collection('customers')
    .find({ tenantId })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .toArray()

  return customers.map((c: any) => {
    const daysSinceFirstOrder = Math.floor(
      (now.getTime() - new Date(c.firstOrderAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Simple LTV prediction based on order frequency and average value
    const ordersPerMonth = daysSinceFirstOrder > 0
      ? (c.totalOrders / daysSinceFirstOrder) * 30
      : c.totalOrders
    const predictedLTV = c.totalSpent + ordersPerMonth * c.averageOrderValue * 12

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
  customerId: string
): Promise<CustomerLTV | null> {
  const db = await getDatabase()
  const customer = await db.collection('customers').findOne({ tenantId, id: customerId })

  if (!customer) return null

  const now = new Date()
  const daysSinceFirstOrder = Math.floor(
    (now.getTime() - new Date(customer.firstOrderAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysSinceLastOrder = Math.floor(
    (now.getTime() - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  const ordersPerMonth = daysSinceFirstOrder > 0
    ? (customer.totalOrders / daysSinceFirstOrder) * 30
    : customer.totalOrders
  const predictedLTV = customer.totalSpent + ordersPerMonth * customer.averageOrderValue * 12

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
  months: number = 12
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
    const cohortStart = new Date(cohortMonth + '-01')

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
              $lt: new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 1, 1),
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

      const monthData = retentionData.find((r: any) => r._id === monthStr)
      if (monthData) {
        retention.push(
          Math.round(((monthData.uniqueCustomers?.length || 0) / totalCohortCustomers) * 100)
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
  tenantId: string
): Promise<{ source: string; customers: number; revenue: number }[]> {
  const db = await getDatabase()

  const sources = await db
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
    .toArray()

  return sources.map((s: any) => ({
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
  filters?: CustomerFilters
): Promise<Customer[]> {
  const db = await getDatabase()
  const query: any = { tenantId }

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
    .toArray()) as Customer[]
}
