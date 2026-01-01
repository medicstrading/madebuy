import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  EmailCampaign,
  EmailCampaignFilters,
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
  EmailMarketingStats,
  EmailSubscriber,
  EmailAutomation,
  EmailTrigger,
} from '@madebuy/shared'

/**
 * Create a new email campaign
 */
export async function createCampaign(
  tenantId: string,
  input: CreateEmailCampaignInput
): Promise<EmailCampaign> {
  const db = await getDatabase()
  const now = new Date()

  const campaign: EmailCampaign = {
    id: nanoid(),
    tenantId,
    name: input.name,
    subject: input.subject,
    content: input.content,
    type: input.type,
    trigger: input.trigger,
    segmentId: input.segmentId,
    status: input.scheduledAt ? 'scheduled' : 'draft',
    scheduledAt: input.scheduledAt,
    stats: {
      sent: 0,
      opened: 0,
      clicked: 0,
      unsubscribed: 0,
      bounced: 0,
      converted: 0,
      revenue: 0,
    },
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('email_campaigns').insertOne(campaign)
  return campaign
}

/**
 * Get campaign by ID
 */
export async function getCampaign(
  tenantId: string,
  id: string
): Promise<EmailCampaign | null> {
  const db = await getDatabase()
  return (await db.collection('email_campaigns').findOne({ tenantId, id })) as EmailCampaign | null
}

/**
 * List campaigns with filters
 */
export async function listCampaigns(
  tenantId: string,
  filters?: EmailCampaignFilters,
  pagination?: { page?: number; limit?: number }
): Promise<{ campaigns: EmailCampaign[]; total: number }> {
  const db = await getDatabase()
  const query: any = { tenantId }

  if (filters?.type) {
    query.type = filters.type
  }
  if (filters?.status) {
    query.status = filters.status
  }
  if (filters?.trigger) {
    query.trigger = filters.trigger
  }

  const page = pagination?.page || 1
  const limit = pagination?.limit || 20
  const skip = (page - 1) * limit

  const [campaigns, total] = await Promise.all([
    db
      .collection('email_campaigns')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('email_campaigns').countDocuments(query),
  ])

  return { campaigns: campaigns as unknown as EmailCampaign[], total }
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  tenantId: string,
  id: string,
  updates: UpdateEmailCampaignInput
): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_campaigns').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_campaigns').deleteOne({ tenantId, id })
}

/**
 * Get campaign stats
 */
export async function getCampaignStats(
  tenantId: string,
  id: string
): Promise<EmailCampaign['stats'] | null> {
  const campaign = await getCampaign(tenantId, id)
  return campaign?.stats || null
}

/**
 * Update campaign stats
 */
export async function updateCampaignStats(
  tenantId: string,
  id: string,
  stats: Partial<EmailCampaign['stats']>
): Promise<void> {
  const db = await getDatabase()
  const updateData: any = { updatedAt: new Date() }

  for (const [key, value] of Object.entries(stats)) {
    updateData[`stats.${key}`] = value
  }

  await db.collection('email_campaigns').updateOne({ tenantId, id }, { $set: updateData })
}

/**
 * Increment campaign stat
 */
export async function incrementCampaignStat(
  tenantId: string,
  id: string,
  stat: keyof EmailCampaign['stats'],
  amount: number = 1
): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_campaigns').updateOne(
    { tenantId, id },
    {
      $inc: { [`stats.${stat}`]: amount },
      $set: { updatedAt: new Date() },
    }
  )
}

/**
 * Mark campaign as sent
 */
export async function markCampaignSent(
  tenantId: string,
  id: string,
  sentCount: number
): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_campaigns').updateOne(
    { tenantId, id },
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        'stats.sent': sentCount,
        updatedAt: new Date(),
      },
    }
  )
}

// ==========================================
// Email Subscribers
// ==========================================

/**
 * Add or update subscriber
 */
export async function upsertSubscriber(
  tenantId: string,
  email: string,
  data?: {
    name?: string
    customerId?: string
    source?: string
    tags?: string[]
  }
): Promise<EmailSubscriber> {
  const db = await getDatabase()
  const now = new Date()

  const existing = await db.collection('email_subscribers').findOne({ tenantId, email })

  if (existing) {
    const updates: any = { updatedAt: now }
    if (data?.name) updates.name = data.name
    if (data?.customerId) updates.customerId = data.customerId
    if (data?.tags) updates.tags = [...new Set([...(existing.tags || []), ...data.tags])]

    await db.collection('email_subscribers').updateOne({ tenantId, email }, { $set: updates })
    return { ...existing, ...updates } as EmailSubscriber
  }

  const subscriber: EmailSubscriber = {
    id: nanoid(),
    tenantId,
    email,
    name: data?.name,
    customerId: data?.customerId,
    status: 'subscribed',
    subscribedAt: now,
    source: data?.source,
    tags: data?.tags || [],
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('email_subscribers').insertOne(subscriber)
  return subscriber
}

/**
 * Unsubscribe email
 */
export async function unsubscribe(tenantId: string, email: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_subscribers').updateOne(
    { tenantId, email },
    {
      $set: {
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Get subscriber
 */
export async function getSubscriber(
  tenantId: string,
  email: string
): Promise<EmailSubscriber | null> {
  const db = await getDatabase()
  return (await db.collection('email_subscribers').findOne({ tenantId, email })) as EmailSubscriber | null
}

/**
 * List subscribers
 */
export async function listSubscribers(
  tenantId: string,
  filters?: { status?: string; tag?: string },
  pagination?: { page?: number; limit?: number }
): Promise<{ subscribers: EmailSubscriber[]; total: number }> {
  const db = await getDatabase()
  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }
  if (filters?.tag) {
    query.tags = filters.tag
  }

  const page = pagination?.page || 1
  const limit = pagination?.limit || 50
  const skip = (page - 1) * limit

  const [subscribers, total] = await Promise.all([
    db
      .collection('email_subscribers')
      .find(query)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('email_subscribers').countDocuments(query),
  ])

  return { subscribers: subscribers as unknown as EmailSubscriber[], total }
}

/**
 * Count subscribers
 */
export async function countSubscribers(
  tenantId: string,
  status?: string
): Promise<number> {
  const db = await getDatabase()
  const query: any = { tenantId }
  if (status) query.status = status
  return await db.collection('email_subscribers').countDocuments(query)
}

// ==========================================
// Email Automations
// ==========================================

/**
 * Create automation
 */
export async function createAutomation(
  tenantId: string,
  data: {
    name: string
    trigger: EmailTrigger
    delayMinutes: number
    emailTemplateId: string
  }
): Promise<EmailAutomation> {
  const db = await getDatabase()
  const now = new Date()

  const automation: EmailAutomation = {
    id: nanoid(),
    tenantId,
    name: data.name,
    trigger: data.trigger,
    isActive: false,
    delayMinutes: data.delayMinutes,
    emailTemplateId: data.emailTemplateId,
    stats: {
      triggered: 0,
      sent: 0,
      converted: 0,
    },
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('email_automations').insertOne(automation)
  return automation
}

/**
 * List automations
 */
export async function listAutomations(
  tenantId: string
): Promise<EmailAutomation[]> {
  const db = await getDatabase()
  return (await db
    .collection('email_automations')
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as EmailAutomation[]
}

/**
 * Toggle automation active state
 */
export async function toggleAutomation(
  tenantId: string,
  id: string,
  isActive: boolean
): Promise<void> {
  const db = await getDatabase()
  await db.collection('email_automations').updateOne(
    { tenantId, id },
    { $set: { isActive, updatedAt: new Date() } }
  )
}

/**
 * Get active automations by trigger
 */
export async function getActiveAutomationsByTrigger(
  tenantId: string,
  trigger: EmailTrigger
): Promise<EmailAutomation[]> {
  const db = await getDatabase()
  return (await db
    .collection('email_automations')
    .find({ tenantId, trigger, isActive: true })
    .toArray()) as unknown as EmailAutomation[]
}

// ==========================================
// Marketing Stats
// ==========================================

/**
 * Get email marketing overview stats
 */
export async function getMarketingStats(tenantId: string): Promise<EmailMarketingStats> {
  const db = await getDatabase()

  const [subscriberStats, campaignStats] = await Promise.all([
    db
      .collection('email_subscribers')
      .aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection('email_campaigns')
      .aggregate([
        { $match: { tenantId, status: 'sent' } },
        {
          $group: {
            _id: null,
            campaignsSent: { $sum: 1 },
            totalSent: { $sum: '$stats.sent' },
            totalOpens: { $sum: '$stats.opened' },
            totalClicks: { $sum: '$stats.clicked' },
          },
        },
      ])
      .toArray(),
  ])

  const activeSubscribers = subscriberStats.find((s: any) => s._id === 'subscribed')?.count || 0
  const unsubscribedCount = subscriberStats.find((s: any) => s._id === 'unsubscribed')?.count || 0
  const totalSubscribers = activeSubscribers + unsubscribedCount

  const stats = campaignStats[0] || {
    campaignsSent: 0,
    totalSent: 0,
    totalOpens: 0,
    totalClicks: 0,
  }

  return {
    totalSubscribers,
    activeSubscribers,
    unsubscribedCount,
    campaignsSent: stats.campaignsSent,
    totalOpens: stats.totalOpens,
    totalClicks: stats.totalClicks,
    averageOpenRate: stats.totalSent > 0 ? (stats.totalOpens / stats.totalSent) * 100 : 0,
    averageClickRate: stats.totalOpens > 0 ? (stats.totalClicks / stats.totalOpens) * 100 : 0,
  }
}
