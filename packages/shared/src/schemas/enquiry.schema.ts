import { z } from 'zod'
import { EmailSchema, ObjectIdSchema, ShortTextSchema } from './common.schema'

/**
 * Enquiry validation schemas
 */

// Enquiry status enum
export const EnquiryStatusSchema = z.enum(['new', 'replied', 'resolved', 'archived'])

// Enquiry source
export const EnquirySourceSchema = z.enum(['shop', 'custom_domain'])

// Create enquiry input
export const CreateEnquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: EmailSchema,
  message: z.string().min(10).max(2000),
  pieceId: ObjectIdSchema.optional(),
  pieceName: ShortTextSchema.optional(),
  source: EnquirySourceSchema.default('shop'),
  sourceDomain: ShortTextSchema.optional(),
  trafficSource: ShortTextSchema.optional(),
  trafficMedium: ShortTextSchema.optional(),
  trafficCampaign: ShortTextSchema.optional(),
  landingPage: z.string().url().optional(),
  sessionId: ShortTextSchema.optional(),
  turnstileToken: z.string().optional(),
})

// Reply to enquiry input
export const ReplyEnquirySchema = z.object({
  message: z.string().min(1).max(5000),
})

// Update enquiry status
export const UpdateEnquirySchema = z.object({
  status: EnquiryStatusSchema,
  notes: z.string().max(1000).optional(),
})

// Enquiry filters
export const EnquiryFiltersSchema = z.object({
  status: EnquiryStatusSchema.optional(),
  pieceId: ObjectIdSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
})

// Inferred types
export type EnquiryStatus = z.infer<typeof EnquiryStatusSchema>
export type EnquirySource = z.infer<typeof EnquirySourceSchema>
export type CreateEnquiryInput = z.infer<typeof CreateEnquirySchema>
export type ReplyEnquiryInput = z.infer<typeof ReplyEnquirySchema>
export type UpdateEnquiryInput = z.infer<typeof UpdateEnquirySchema>
export type EnquiryFilters = z.infer<typeof EnquiryFiltersSchema>

// Validation helpers
export function validateCreateEnquiry(data: unknown): CreateEnquiryInput {
  return CreateEnquirySchema.parse(data)
}

export function safeValidateCreateEnquiry(data: unknown) {
  return CreateEnquirySchema.safeParse(data)
}

export function validateReplyEnquiry(data: unknown): ReplyEnquiryInput {
  return ReplyEnquirySchema.parse(data)
}

export function safeValidateReplyEnquiry(data: unknown) {
  return ReplyEnquirySchema.safeParse(data)
}

export function validateUpdateEnquiry(data: unknown): UpdateEnquiryInput {
  return UpdateEnquirySchema.parse(data)
}

export function safeValidateUpdateEnquiry(data: unknown) {
  return UpdateEnquirySchema.safeParse(data)
}
