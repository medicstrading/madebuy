/**
 * Enquiry - Customer enquiries/contact forms
 */

export interface Enquiry {
  id: string
  tenantId: string

  name: string
  email: string
  message: string

  pieceId?: string
  pieceName?: string

  status: EnquiryStatus
  notes?: string

  // Reply tracking
  reply?: EnquiryReply
  repliedAt?: Date

  // Where the form was shown
  source: 'shop' | 'custom_domain'
  sourceDomain?: string

  // Traffic attribution (UTM-based)
  trafficSource?: string // e.g., 'instagram', 'marketplace', 'google'
  trafficMedium?: string
  trafficCampaign?: string
  landingPage?: string
  sessionId?: string

  createdAt: Date
  updatedAt: Date
}

export interface EnquiryReply {
  subject: string
  body: string
  sentAt: Date
}

export type EnquiryStatus = 'new' | 'read' | 'replied' | 'archived'

export interface CreateEnquiryInput {
  name: string
  email: string
  message: string
  pieceId?: string
  pieceName?: string
  source: 'shop' | 'custom_domain'
  sourceDomain?: string
  // Traffic attribution (from cookies)
  trafficSource?: string
  trafficMedium?: string
  trafficCampaign?: string
  landingPage?: string
  sessionId?: string
}

export interface UpdateEnquiryInput {
  status?: EnquiryStatus
  notes?: string
}

export interface EnquiryFilters {
  status?: EnquiryStatus
  pieceId?: string
  search?: string
}
