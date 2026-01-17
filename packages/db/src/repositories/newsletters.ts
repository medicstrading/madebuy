import type {
  CreateNewsletterInput,
  Newsletter,
  NewsletterListOptions,
  NewsletterStats,
  NewsletterTemplate,
  UpdateNewsletterInput,
  UpdateNewsletterTemplateInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

// ============ Newsletter CRUD ============

export async function createNewsletter(
  tenantId: string,
  input: CreateNewsletterInput,
): Promise<Newsletter> {
  const db = await getDatabase()
  const now = new Date()

  const newsletter: Newsletter = {
    id: nanoid(),
    tenantId,
    subject: input.subject,
    content: input.content || '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('newsletters').insertOne(newsletter)
  return newsletter
}

export async function getNewsletterById(
  tenantId: string,
  id: string,
): Promise<Newsletter | null> {
  const db = await getDatabase()
  const newsletter = await db
    .collection('newsletters')
    .findOne({ tenantId, id })
  return newsletter as unknown as Newsletter | null
}

export async function updateNewsletter(
  tenantId: string,
  id: string,
  input: UpdateNewsletterInput,
): Promise<Newsletter | null> {
  const db = await getDatabase()

  // Only allow updating drafts
  const existing = await getNewsletterById(tenantId, id)
  if (!existing || existing.status !== 'draft') {
    return null
  }

  const updateData: any = {
    ...input,
    updatedAt: new Date(),
  }

  const result = await db
    .collection('newsletters')
    .findOneAndUpdate(
      { tenantId, id, status: 'draft' },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  return result as unknown as Newsletter | null
}

export async function deleteNewsletter(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection('newsletters').deleteOne({ tenantId, id })
  return result.deletedCount === 1
}

export async function markNewsletterSent(
  tenantId: string,
  id: string,
  recipientCount: number,
): Promise<Newsletter | null> {
  const db = await getDatabase()

  const result = await db.collection('newsletters').findOneAndUpdate(
    { tenantId, id, status: 'draft' },
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        recipientCount,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )

  return result as unknown as Newsletter | null
}

export async function listNewsletters(
  tenantId: string,
  options: NewsletterListOptions = {},
): Promise<{ items: Newsletter[]; total: number; hasMore: boolean }> {
  const db = await getDatabase()

  const filter: any = { tenantId }

  if (options.status) {
    filter.status = options.status
  }

  const limit = options.limit || 20
  const offset = options.offset || 0

  const sortField = options.sortBy || 'createdAt'
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1
  const sort: any = { [sortField]: sortOrder }

  const [items, total] = await Promise.all([
    db
      .collection('newsletters')
      .find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection('newsletters').countDocuments(filter),
  ])

  return {
    items: items as unknown as Newsletter[],
    total,
    hasMore: offset + items.length < total,
  }
}

export async function getNewsletterStats(
  tenantId: string,
): Promise<NewsletterStats> {
  const db = await getDatabase()

  const stats = await db
    .collection('newsletters')
    .aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          drafts: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
          },
          sent: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] },
          },
        },
      },
    ])
    .toArray()

  if (stats.length === 0) {
    return { total: 0, drafts: 0, sent: 0 }
  }

  const lastSent = await db
    .collection('newsletters')
    .findOne(
      { tenantId, status: 'sent', sentAt: { $exists: true } },
      { sort: { sentAt: -1 }, projection: { sentAt: 1 } },
    )

  return {
    total: stats[0].total,
    drafts: stats[0].drafts,
    sent: stats[0].sent,
    lastSentAt: lastSent?.sentAt,
  }
}

// ============ Newsletter Template ============

const DEFAULT_TEMPLATE: Omit<
  NewsletterTemplate,
  'id' | 'tenantId' | 'updatedAt'
> = {
  header: {
    showLogo: true,
    headerText: 'Newsletter',
    tagline: '',
    greetingText: 'Hi there!',
  },
  colors: {
    primary: '#4F46E5',
    accent: '#10B981',
    background: '#F9FAFB',
    text: '#374151',
  },
  footer: {
    signatureText: 'Best regards,',
    signatureName: '',
    signatureTitle: '',
    showSocialLinks: true,
    footerText: '',
  },
  sections: {
    showGreeting: true,
    showCtaButton: false,
    ctaButtonText: 'Shop Now',
    ctaButtonUrl: '',
  },
}

export async function getNewsletterTemplate(
  tenantId: string,
): Promise<NewsletterTemplate> {
  const db = await getDatabase()

  const template = await db
    .collection('newsletter_templates')
    .findOne({ tenantId })

  if (template) {
    return template as unknown as NewsletterTemplate
  }

  // Create default template for this tenant
  const newTemplate: NewsletterTemplate = {
    id: nanoid(),
    tenantId,
    ...DEFAULT_TEMPLATE,
    updatedAt: new Date(),
  }

  await db.collection('newsletter_templates').insertOne(newTemplate)
  return newTemplate
}

export async function updateNewsletterTemplate(
  tenantId: string,
  input: UpdateNewsletterTemplateInput,
): Promise<NewsletterTemplate> {
  const db = await getDatabase()

  // Get existing template to merge with
  const existing = await getNewsletterTemplate(tenantId)

  // Deep merge the updates
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (input.header) {
    updateData.header = { ...existing.header, ...input.header }
  }
  if (input.colors) {
    updateData.colors = { ...existing.colors, ...input.colors }
  }
  if (input.footer) {
    updateData.footer = { ...existing.footer, ...input.footer }
  }
  if (input.sections) {
    updateData.sections = { ...existing.sections, ...input.sections }
  }

  const result = await db
    .collection('newsletter_templates')
    .findOneAndUpdate(
      { tenantId },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  return result as unknown as NewsletterTemplate
}

export async function resetNewsletterTemplate(
  tenantId: string,
): Promise<NewsletterTemplate> {
  const db = await getDatabase()

  const template: NewsletterTemplate = {
    id: nanoid(),
    tenantId,
    ...DEFAULT_TEMPLATE,
    updatedAt: new Date(),
  }

  await db
    .collection('newsletter_templates')
    .replaceOne({ tenantId }, template, { upsert: true })

  return template
}
