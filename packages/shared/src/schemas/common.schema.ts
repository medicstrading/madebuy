import { z } from 'zod'

/**
 * Common validation schemas
 * Reusable schemas for shared fields
 */

// MongoDB ObjectId validation (24 hex characters)
export const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

// Pagination schemas
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export type Pagination = z.infer<typeof PaginationSchema>

// Sort order
export const SortOrderSchema = z.enum(['asc', 'desc'])

// Currency code (ISO 4217)
export const CurrencyCodeSchema = z
  .string()
  .length(3)
  .toUpperCase()
  .default('AUD')

// Country code (ISO 3166-1 alpha-2)
export const CountryCodeSchema = z
  .string()
  .length(2)
  .toUpperCase()

// Email validation
export const EmailSchema = z.string().email('Invalid email address').max(255)

// Phone validation (international format)
export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
  .optional()

// URL validation
export const UrlSchema = z.string().url('Invalid URL').max(2000)

// Slug validation (lowercase, alphanumeric, hyphens)
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
  .min(3)
  .max(100)

// Color hex code
export const ColorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')

// Positive number (for prices, quantities)
export const PositiveNumberSchema = z.number().positive()

// Non-negative number (for counts, stock levels)
export const NonNegativeNumberSchema = z.number().min(0)

// Date range
export const DateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
})

// Text input with max length
export const ShortTextSchema = z.string().max(255)
export const MediumTextSchema = z.string().max(1000)
export const LongTextSchema = z.string().max(10000)
