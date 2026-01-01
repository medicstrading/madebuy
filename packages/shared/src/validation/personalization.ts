import { z } from 'zod'
import type { PersonalizationField, PersonalizationConfig } from '../types/piece'

/**
 * Personalization validation schemas
 * Used to validate personalization configuration and buyer input
 */

// Field type enum
export const PersonalizationFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'select',
  'checkbox',
  'file',
  'date',
  'number',
])

// Base field schema (without refinements, for deriving other schemas)
const PersonalizationFieldBaseSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  name: z.string().min(1, 'Field name is required').max(100, 'Field name too long'),
  type: PersonalizationFieldTypeSchema,
  required: z.boolean(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),

  // Text validation
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
  pattern: z.string().max(500).optional(),
  patternError: z.string().max(200).optional(),

  // Select options
  options: z.array(z.string().min(1).max(100)).max(100).optional(),

  // Number constraints
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),

  // File constraints
  acceptedFileTypes: z.array(z.string()).optional(),
  maxFileSizeMB: z.number().positive().max(50).optional(),

  // Date constraints
  minDate: z.string().optional(),
  maxDate: z.string().optional(),

  // Pricing
  priceAdjustment: z.number().int().min(0).optional(),
  priceAdjustmentType: z.enum(['fixed', 'percentage']).optional(),

  // Display order
  displayOrder: z.number().int().min(0),

  // Deprecated
  label: z.string().optional(),
})

// Single personalization field schema (for admin config) with refinements
export const PersonalizationFieldSchema = PersonalizationFieldBaseSchema.refine(
  (data) => {
    // If type is select, options must be provided
    if (data.type === 'select' && (!data.options || data.options.length === 0)) {
      return false
    }
    return true
  },
  { message: 'Select fields must have at least one option', path: ['options'] }
).refine(
  (data) => {
    // maxLength must be >= minLength
    if (data.minLength !== undefined && data.maxLength !== undefined) {
      return data.maxLength >= data.minLength
    }
    return true
  },
  { message: 'maxLength must be greater than or equal to minLength', path: ['maxLength'] }
).refine(
  (data) => {
    // max must be >= min for number fields
    if (data.type === 'number' && data.min !== undefined && data.max !== undefined) {
      return data.max >= data.min
    }
    return true
  },
  { message: 'max must be greater than or equal to min', path: ['max'] }
)

// Full personalization config schema (for admin)
export const PersonalizationConfigSchema = z.object({
  enabled: z.boolean(),
  fields: z.array(PersonalizationFieldSchema).max(20, 'Maximum 20 fields allowed'),
  previewEnabled: z.boolean().optional(),
  processingDays: z.number().int().min(0).max(365).optional(),
  instructions: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.enabled && data.fields.length === 0) {
      return false
    }
    return true
  },
  { message: 'At least one field is required when personalization is enabled', path: ['fields'] }
)

// Schema for creating/updating field (without id)
export const CreatePersonalizationFieldSchema = PersonalizationFieldBaseSchema.omit({ id: true })

// Personalization value schema (buyer input)
export const PersonalizationValueSchema = z.object({
  fieldId: z.string().min(1),
  fieldName: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  priceAdjustment: z.number().int().min(0),
})

// Array of personalization values (for order)
export const PersonalizationValuesSchema = z.array(PersonalizationValueSchema)

// Inferred types
export type PersonalizationFieldInput = z.infer<typeof PersonalizationFieldSchema>
export type PersonalizationConfigInput = z.infer<typeof PersonalizationConfigSchema>
export type PersonalizationValueInput = z.infer<typeof PersonalizationValueSchema>

/**
 * Validate a single personalization value against its field config
 * Returns array of error messages (empty if valid)
 */
export function validateFieldValue(
  field: PersonalizationField,
  value: string | number | boolean | null | undefined,
  fileUrl?: string
): string[] {
  const errors: string[] = []
  const fieldName = field.name || field.label || 'Field'

  // Check required
  if (field.required) {
    if (value === null || value === undefined || value === '') {
      errors.push(`${fieldName} is required`)
      return errors
    }
  }

  // If not required and empty, skip validation
  if (value === null || value === undefined || value === '') {
    return errors
  }

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const strValue = String(value)
      if (field.minLength !== undefined && strValue.length < field.minLength) {
        errors.push(`${fieldName} must be at least ${field.minLength} characters`)
      }
      if (field.maxLength !== undefined && strValue.length > field.maxLength) {
        errors.push(`${fieldName} must be at most ${field.maxLength} characters`)
      }
      if (field.pattern) {
        try {
          const regex = new RegExp(field.pattern)
          if (!regex.test(strValue)) {
            errors.push(field.patternError || `${fieldName} format is invalid`)
          }
        } catch {
          // Invalid regex pattern in config, skip validation
        }
      }
      break
    }

    case 'select': {
      const strValue = String(value)
      if (field.options && !field.options.includes(strValue)) {
        errors.push(`${fieldName} must be one of: ${field.options.join(', ')}`)
      }
      break
    }

    case 'checkbox': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`${fieldName} must be true or false`)
      }
      break
    }

    case 'number': {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value))
      if (isNaN(numValue)) {
        errors.push(`${fieldName} must be a number`)
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push(`${fieldName} must be at least ${field.min}`)
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push(`${fieldName} must be at most ${field.max}`)
        }
        if (field.step !== undefined) {
          const remainder = (numValue - (field.min || 0)) % field.step
          if (Math.abs(remainder) > 0.0001) {
            errors.push(`${fieldName} must be in increments of ${field.step}`)
          }
        }
      }
      break
    }

    case 'date': {
      const dateValue = new Date(String(value))
      if (isNaN(dateValue.getTime())) {
        errors.push(`${fieldName} must be a valid date`)
      } else {
        if (field.minDate) {
          const minDate = new Date(field.minDate)
          if (dateValue < minDate) {
            errors.push(`${fieldName} must be on or after ${field.minDate}`)
          }
        }
        if (field.maxDate) {
          const maxDate = new Date(field.maxDate)
          if (dateValue > maxDate) {
            errors.push(`${fieldName} must be on or before ${field.maxDate}`)
          }
        }
      }
      break
    }

    case 'file': {
      if (field.required && !fileUrl) {
        errors.push(`${fieldName} file upload is required`)
      }
      // File type and size validation happens during upload
      break
    }
  }

  return errors
}

/**
 * Validate all personalization values against a config
 * Returns object with field-specific errors and overall validity
 */
export function validatePersonalizationValues(
  config: PersonalizationConfig,
  values: Record<string, { value: string | number | boolean; fileUrl?: string }>
): {
  valid: boolean
  errors: Record<string, string[]>
  totalPriceAdjustment: number
} {
  const errors: Record<string, string[]> = {}
  let totalPriceAdjustment = 0

  for (const field of config.fields) {
    const input = values[field.id]
    const value = input?.value
    const fileUrl = input?.fileUrl

    const fieldErrors = validateFieldValue(field, value, fileUrl)
    if (fieldErrors.length > 0) {
      errors[field.id] = fieldErrors
    }

    // Calculate price adjustment if value is provided
    if (value !== null && value !== undefined && value !== '' && field.priceAdjustment) {
      if (field.priceAdjustmentType === 'fixed') {
        totalPriceAdjustment += field.priceAdjustment
      }
      // Percentage adjustments need to be calculated on the base price at checkout
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    totalPriceAdjustment,
  }
}

/**
 * Calculate total personalization price adjustment
 * @param config Personalization config
 * @param values Field values
 * @param basePrice Base item price in cents (for percentage calculations)
 */
export function calculatePersonalizationTotal(
  config: PersonalizationConfig,
  values: Record<string, { value: string | number | boolean; fileUrl?: string }>,
  basePrice: number
): number {
  let total = 0

  for (const field of config.fields) {
    const input = values[field.id]
    if (!input || input.value === null || input.value === undefined || input.value === '') {
      continue
    }

    if (field.priceAdjustment) {
      if (field.priceAdjustmentType === 'percentage') {
        total += Math.round(basePrice * (field.priceAdjustment / 100))
      } else {
        // Default to fixed
        total += field.priceAdjustment
      }
    }
  }

  return total
}

/**
 * Safe validate personalization config
 */
export function safeValidatePersonalizationConfig(data: unknown) {
  return PersonalizationConfigSchema.safeParse(data)
}

/**
 * Validate personalization config (throws on error)
 */
export function validatePersonalizationConfig(data: unknown): PersonalizationConfigInput {
  return PersonalizationConfigSchema.parse(data)
}
