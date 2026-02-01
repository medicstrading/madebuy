/**
 * System Health Repository
 * Infrastructure and monitoring metrics
 */

import type {
  CollectionStats,
  ComponentHealth,
  ErrorStats,
  MongoStats,
  SystemHealth,
  WebhookStats,
} from '@madebuy/shared'
import { subDays, subHours } from 'date-fns'
import { getDatabase, getMongoClient } from '../client'

/**
 * Get MongoDB statistics
 */
export async function getMongoStats(): Promise<MongoStats> {
  const db = await getDatabase()
  const client = await getMongoClient()

  // Get server status for connection info
  const serverStatus = await db.command({ serverStatus: 1 })
  const dbStats = await db.command({ dbStats: 1 })

  // Get collection stats
  const collections = await db.listCollections().toArray()
  const collectionStats: CollectionStats[] = []

  for (const coll of collections.slice(0, 20)) {
    // Limit to avoid timeout
    try {
      const stats = await db.command({ collStats: coll.name })
      collectionStats.push({
        name: coll.name,
        count: stats.count || 0,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        indexCount: stats.nindexes || 0,
      })
    } catch {
      // Skip collections we can't access
    }
  }

  // Sort by size descending
  collectionStats.sort((a, b) => b.size - a.size)

  return {
    connections: serverStatus.connections?.current || 0,
    availableConnections: serverStatus.connections?.available || 0,
    storageSize: dbStats.storageSize || 0,
    dataSize: dbStats.dataSize || 0,
    indexSize: dbStats.indexSize || 0,
    collections: collectionStats,
  }
}

/**
 * Get overall system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const components: ComponentHealth[] = []

  // Check MongoDB
  try {
    const start = Date.now()
    const db = await getDatabase()
    await db.command({ ping: 1 })
    const latency = Date.now() - start

    components.push({
      name: 'MongoDB',
      status:
        latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'critical',
      latency,
    })
  } catch (error) {
    components.push({
      name: 'MongoDB',
      status: 'critical',
      details: error instanceof Error ? error.message : 'Connection failed',
    })
  }

  // Determine overall status
  const criticalCount = components.filter((c) => c.status === 'critical').length
  const degradedCount = components.filter((c) => c.status === 'degraded').length

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (criticalCount > 0) status = 'critical'
  else if (degradedCount > 0) status = 'degraded'

  return {
    status,
    uptime: process.uptime(),
    lastChecked: new Date(),
    components,
  }
}

/**
 * Get recent errors from audit log
 */
export async function getRecentErrors(limit: number = 50): Promise<unknown[]> {
  const db = await getDatabase()
  const oneDayAgo = subDays(new Date(), 1)

  return db
    .collection('audit_log')
    .find({
      success: false,
      createdAt: { $gte: oneDayAgo },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

/**
 * Get error rate over time
 */
export async function getErrorRate(hours: number = 24): Promise<ErrorStats[]> {
  const db = await getDatabase()
  const startDate = subHours(new Date(), hours)

  const pipeline = [
    {
      $match: {
        success: false,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%dT%H:00:00Z',
            date: '$createdAt',
          },
        },
        count: { $sum: 1 },
        types: {
          $push: '$eventType',
        },
      },
    },
    { $sort: { _id: 1 } },
  ]

  const results = await db.collection('audit_log').aggregate(pipeline).toArray()

  return results.map((r) => {
    // Count event types
    const typeCounts: Record<string, number> = {}
    for (const type of r.types) {
      typeCounts[type] = (typeCounts[type] || 0) + 1
    }

    return {
      timestamp: r._id,
      count: r.count,
      types: typeCounts,
    }
  })
}

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(): Promise<WebhookStats> {
  const db = await getDatabase()
  const oneDayAgo = subDays(new Date(), 1)

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: oneDayAgo },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]

  const results = await db
    .collection('webhook_logs')
    .aggregate(pipeline)
    .toArray()

  let total = 0
  let successful = 0
  let failed = 0
  let pending = 0
  let avgResponseTime = 0
  let totalWithTime = 0

  for (const r of results) {
    total += r.count
    if (r._id === 'success' || r._id === 'delivered') {
      successful += r.count
    } else if (r._id === 'failed' || r._id === 'error') {
      failed += r.count
    } else if (r._id === 'pending') {
      pending += r.count
    }

    if (r.avgResponseTime) {
      avgResponseTime += r.avgResponseTime * r.count
      totalWithTime += r.count
    }
  }

  return {
    total,
    successful,
    failed,
    pending,
    avgResponseTime: totalWithTime > 0 ? avgResponseTime / totalWithTime : 0,
  }
}

/**
 * Get API response time metrics
 */
export async function getApiMetrics(
  hours: number = 24,
): Promise<
  { endpoint: string; avgLatency: number; count: number; errorRate: number }[]
> {
  const db = await getDatabase()
  const startDate = subHours(new Date(), hours)

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate },
        eventType: { $regex: /^api\./ },
      },
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        errors: {
          $sum: { $cond: ['$success', 0, 1] },
        },
        avgLatency: { $avg: '$metadata.latency' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]

  const results = await db.collection('audit_log').aggregate(pipeline).toArray()

  return results.map((r) => ({
    endpoint: r._id.replace('api.', ''),
    avgLatency: r.avgLatency || 0,
    count: r.count,
    errorRate: r.count > 0 ? (r.errors / r.count) * 100 : 0,
  }))
}

/**
 * Get storage usage by tenant
 */
export async function getStorageByTenant(
  limit: number = 10,
): Promise<
  { tenantId: string; businessName: string; size: number; mediaCount: number }[]
> {
  const db = await getDatabase()

  const pipeline = [
    {
      $group: {
        _id: '$tenantId',
        size: { $sum: '$size' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'tenants',
        localField: '_id',
        foreignField: 'id',
        as: 'tenant',
      },
    },
    { $unwind: '$tenant' },
    {
      $project: {
        tenantId: '$_id',
        businessName: '$tenant.businessName',
        size: 1,
        mediaCount: '$count',
      },
    },
    { $sort: { size: -1 } },
    { $limit: limit },
  ]

  const results = await db.collection('media').aggregate(pipeline).toArray()

  return results.map((r) => ({
    tenantId: r.tenantId,
    businessName: r.businessName || 'Unknown',
    size: r.size,
    mediaCount: r.mediaCount,
  }))
}
