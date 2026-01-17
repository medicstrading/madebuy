/**
 * Newsletter System Types
 */

export type NewsletterStatus = 'draft' | 'sent'

export type NewsletterCropMode = 'auto' | 'manual'
export type NewsletterOrientation = 'landscape' | 'portrait'

export interface NewsletterManualCrop {
  zoom: number // 1.0 to 3.0
  panX: number // 0-1 normalized (0.5 = centered)
  panY: number // 0-1 normalized (0.5 = centered)
}

export interface NewsletterImage {
  mediaId: string
  orientation?: NewsletterOrientation
  cropMode?: NewsletterCropMode
  focalPoint?: { x: number; y: number }
  manualCrop?: NewsletterManualCrop
  caption?: string
}

export interface Newsletter {
  id: string
  tenantId: string
  subject: string
  content: string
  images?: NewsletterImage[]
  status: NewsletterStatus
  sentAt?: Date
  recipientCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateNewsletterInput {
  subject: string
  content?: string
}

export interface UpdateNewsletterInput {
  subject?: string
  content?: string
  images?: NewsletterImage[]
}

export interface NewsletterListOptions {
  status?: NewsletterStatus
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'sentAt' | 'subject'
  sortOrder?: 'asc' | 'desc'
}

export interface NewsletterStats {
  total: number
  drafts: number
  sent: number
  lastSentAt?: Date
}

// Newsletter Template (per-tenant)
export interface NewsletterTemplateHeader {
  showLogo: boolean
  headerText: string
  tagline: string
  greetingText: string
}

export interface NewsletterTemplateColors {
  primary: string
  accent: string
  background: string
  text: string
}

export interface NewsletterTemplateFooter {
  signatureText: string
  signatureName: string
  signatureTitle: string
  showSocialLinks: boolean
  footerText: string
}

export interface NewsletterTemplateSections {
  showGreeting: boolean
  showCtaButton: boolean
  ctaButtonText: string
  ctaButtonUrl: string
}

export interface NewsletterTemplate {
  id: string
  tenantId: string
  header: NewsletterTemplateHeader
  colors: NewsletterTemplateColors
  footer: NewsletterTemplateFooter
  sections: NewsletterTemplateSections
  updatedAt: Date
}

export interface UpdateNewsletterTemplateInput {
  header?: Partial<NewsletterTemplateHeader>
  colors?: Partial<NewsletterTemplateColors>
  footer?: Partial<NewsletterTemplateFooter>
  sections?: Partial<NewsletterTemplateSections>
}
