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

  source: 'shop' | 'custom_domain'
  sourceDomain?: string

  createdAt: Date
  updatedAt: Date
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
