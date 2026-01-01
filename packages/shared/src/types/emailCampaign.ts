/**
 * Email Campaign Types
 * Email marketing campaigns and automation
 */

export interface EmailCampaign {
  id: string
  tenantId: string
  name: string
  subject: string
  content: string

  type: 'manual' | 'automated'
  trigger?: EmailTrigger

  segmentId?: string

  status: EmailCampaignStatus
  scheduledAt?: Date
  sentAt?: Date

  stats: EmailCampaignStats

  createdAt: Date
  updatedAt: Date
}

export type EmailTrigger =
  | 'abandoned_cart'
  | 'post_purchase'
  | 'win_back'
  | 'welcome'
  | 'birthday'

export type EmailCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'

export interface EmailCampaignStats {
  sent: number
  opened: number
  clicked: number
  unsubscribed: number
  bounced: number
  converted: number
  revenue: number
}

export interface EmailSubscriber {
  id: string
  tenantId: string
  email: string
  name?: string
  customerId?: string
  status: 'subscribed' | 'unsubscribed' | 'bounced'
  subscribedAt: Date
  unsubscribedAt?: Date
  source?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface EmailAutomation {
  id: string
  tenantId: string
  name: string
  trigger: EmailTrigger
  isActive: boolean
  delayMinutes: number
  emailTemplateId: string
  conditions?: AutomationCondition[]
  stats: {
    triggered: number
    sent: number
    converted: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface AutomationCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains'
  value: string | number
}

export interface CreateEmailCampaignInput {
  name: string
  subject: string
  content: string
  type: 'manual' | 'automated'
  trigger?: EmailTrigger
  segmentId?: string
  scheduledAt?: Date
}

export interface UpdateEmailCampaignInput {
  name?: string
  subject?: string
  content?: string
  segmentId?: string
  scheduledAt?: Date
  status?: EmailCampaignStatus
}

export interface EmailCampaignFilters {
  type?: 'manual' | 'automated'
  status?: EmailCampaignStatus
  trigger?: EmailTrigger
}

export interface EmailMarketingStats {
  totalSubscribers: number
  activeSubscribers: number
  unsubscribedCount: number
  campaignsSent: number
  totalOpens: number
  totalClicks: number
  averageOpenRate: number
  averageClickRate: number
}
