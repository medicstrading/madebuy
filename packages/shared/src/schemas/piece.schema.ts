import { z } from 'zod'
import {
  CurrencyCodeSchema,
  LongTextSchema,
  NonNegativeNumberSchema,
  ObjectIdSchema,
  PositiveNumberSchema,
  ShortTextSchema,
} from './common.schema'

/**
 * Piece (Product) validation schemas
 */

// Piece status enum
export const PieceStatusSchema = z.enum([
  'available',
  'sold',
  'draft',
  'archived',
])

// Material usage (for COGS tracking)
export const MaterialUsageSchema = z.object({
  materialId: ObjectIdSchema,
  quantity: PositiveNumberSchema,
  unit: ShortTextSchema.optional(),
})

// Product variant option
export const VariantOptionSchema = z.object({
  name: ShortTextSchema,
  values: z.array(ShortTextSchema).min(1).max(50),
})

// Product variant
export const ProductVariantSchema = z.object({
  id: z.string().min(1),
  sku: ShortTextSchema.optional(),
  options: z.record(z.string()),
  price: PositiveNumberSchema.optional(),
  stock: NonNegativeNumberSchema.optional(),
  isAvailable: z.boolean().default(true),
})

// Personalization field (simplified version for piece creation)
export const PiecePersonalizationFieldSchema = z.object({
  id: z.string().min(1),
  label: ShortTextSchema,
  type: z.enum(['text', 'textarea', 'select', 'file']),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
  options: z.array(ShortTextSchema).optional(),
  price: NonNegativeNumberSchema.optional(),
  helpText: z.string().max(500).optional(),
})

// Shipping dimensions
export const ShippingDimensionsSchema = z.object({
  weight: PositiveNumberSchema.optional(),
  length: PositiveNumberSchema.optional(),
  width: PositiveNumberSchema.optional(),
  height: PositiveNumberSchema.optional(),
})

// Digital product file
export const DigitalFileSchema = z.object({
  id: z.string().min(1),
  name: ShortTextSchema,
  size: z.number().int().positive(),
  contentType: ShortTextSchema,
  r2Key: z.string().min(1),
  uploadedAt: z.date(),
})

// Create piece input
export const CreatePieceSchema = z.object({
  name: z.string().min(1).max(200),
  description: LongTextSchema.optional(),
  category: ShortTextSchema.optional(),
  price: PositiveNumberSchema,
  currency: CurrencyCodeSchema,
  status: PieceStatusSchema.default('available'),
  stock: NonNegativeNumberSchema.default(0),
  lowStockThreshold: NonNegativeNumberSchema.optional(),
  sku: ShortTextSchema.optional(),
  barcode: ShortTextSchema.optional(),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),

  // Media
  mediaIds: z.array(ObjectIdSchema).optional(),
  primaryMediaId: ObjectIdSchema.optional(),

  // Materials (for COGS)
  materialsUsed: z.array(MaterialUsageSchema).optional(),
  laborCost: NonNegativeNumberSchema.optional(),
  overheadCost: NonNegativeNumberSchema.optional(),

  // Variants
  hasVariants: z.boolean().default(false),
  variantOptions: z.array(VariantOptionSchema).optional(),
  variants: z.array(ProductVariantSchema).optional(),

  // Personalization
  hasPersonalization: z.boolean().default(false),
  personalizationFields: z.array(PiecePersonalizationFieldSchema).optional(),

  // Shipping
  shippingWeight: PositiveNumberSchema.optional(),
  shippingLength: PositiveNumberSchema.optional(),
  shippingWidth: PositiveNumberSchema.optional(),
  shippingHeight: PositiveNumberSchema.optional(),
  requiresShipping: z.boolean().default(true),

  // Digital files (if isDigital)
  digitalFiles: z.array(DigitalFileSchema).optional(),

  // Collections
  collectionIds: z.array(ObjectIdSchema).optional(),
})

// Update piece input (all fields optional)
export const UpdatePieceSchema = CreatePieceSchema.partial()

// Bulk update pieces
export const BulkUpdatePiecesSchema = z.object({
  pieceIds: z.array(ObjectIdSchema).min(1).max(100),
  updates: z.object({
    status: PieceStatusSchema.optional(),
    category: ShortTextSchema.optional(),
    isFeatured: z.boolean().optional(),
    lowStockThreshold: NonNegativeNumberSchema.optional(),
    price: PositiveNumberSchema.optional(),
  }),
})

// Inferred types
export type PieceStatus = z.infer<typeof PieceStatusSchema>
export type MaterialUsage = z.infer<typeof MaterialUsageSchema>
export type VariantOption = z.infer<typeof VariantOptionSchema>
export type ProductVariant = z.infer<typeof ProductVariantSchema>
export type PiecePersonalizationField = z.infer<
  typeof PiecePersonalizationFieldSchema
>
export type ShippingDimensions = z.infer<typeof ShippingDimensionsSchema>
export type DigitalFile = z.infer<typeof DigitalFileSchema>
export type CreatePieceInput = z.infer<typeof CreatePieceSchema>
export type UpdatePieceInput = z.infer<typeof UpdatePieceSchema>
export type BulkUpdatePiecesInput = z.infer<typeof BulkUpdatePiecesSchema>

// Validation helpers
export function validateCreatePiece(data: unknown): CreatePieceInput {
  return CreatePieceSchema.parse(data)
}

export function safeValidateCreatePiece(data: unknown) {
  return CreatePieceSchema.safeParse(data)
}

export function validateUpdatePiece(data: unknown): UpdatePieceInput {
  return UpdatePieceSchema.parse(data)
}

export function safeValidateUpdatePiece(data: unknown) {
  return UpdatePieceSchema.safeParse(data)
}

export function validateBulkUpdatePieces(data: unknown): BulkUpdatePiecesInput {
  return BulkUpdatePiecesSchema.parse(data)
}

export function safeValidateBulkUpdatePieces(data: unknown) {
  return BulkUpdatePiecesSchema.safeParse(data)
}
