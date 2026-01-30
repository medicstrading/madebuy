import { z } from 'zod'
import { EmailSchema, ObjectIdSchema, ShortTextSchema } from './common.schema'

/**
 * Review validation schemas
 */

// Review status enum
export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected'])

// Create review input
export const CreateReviewSchema = z.object({
  pieceId: ObjectIdSchema,
  orderId: ObjectIdSchema,
  customerEmail: EmailSchema,
  customerName: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  text: z.string().min(10).max(2000),
  photos: z.array(z.string().url()).max(5).default([]),
})

// Update review (moderate)
export const UpdateReviewSchema = z.object({
  status: ReviewStatusSchema,
  moderatorNotes: z.string().max(500).optional(),
})

// Review filters
export const ReviewFiltersSchema = z.object({
  pieceId: ObjectIdSchema.optional(),
  status: ReviewStatusSchema.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

// Inferred types
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>
export type ReviewFilters = z.infer<typeof ReviewFiltersSchema>

// Validation helpers
export function validateCreateReview(data: unknown): CreateReviewInput {
  return CreateReviewSchema.parse(data)
}

export function safeValidateCreateReview(data: unknown) {
  return CreateReviewSchema.safeParse(data)
}

export function validateUpdateReview(data: unknown): UpdateReviewInput {
  return UpdateReviewSchema.parse(data)
}

export function safeValidateUpdateReview(data: unknown) {
  return UpdateReviewSchema.safeParse(data)
}
