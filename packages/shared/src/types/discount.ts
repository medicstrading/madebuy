/**
 * Discount Code - Promo codes for checkout
 */

export type DiscountType = 'percentage' | 'fixed' | 'free_shipping'

export interface DiscountCode {
  id: string
  tenantId: string

  // Code details
  code: string              // e.g., "SUMMER20" (stored uppercase)
  description?: string      // Internal note

  // Discount value
  type: DiscountType
  value: number             // Percentage (0-100) or fixed amount

  // Constraints
  minOrderAmount?: number   // Minimum order value to apply
  maxDiscountAmount?: number // Cap for percentage discounts
  maxUses?: number          // Total uses allowed (null = unlimited)
  maxUsesPerCustomer?: number // Per-customer limit

  // Applicability
  applicablePieceIds?: string[]      // Specific pieces (empty = all)
  applicableCategories?: string[]    // Specific categories (empty = all)
  excludedPieceIds?: string[]        // Pieces to exclude

  // Validity
  startsAt?: Date
  expiresAt?: Date
  isActive: boolean

  // Usage tracking
  usageCount: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface CreateDiscountCodeInput {
  code: string
  description?: string
  type: DiscountType
  value: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  maxUses?: number
  maxUsesPerCustomer?: number
  applicablePieceIds?: string[]
  applicableCategories?: string[]
  excludedPieceIds?: string[]
  startsAt?: Date
  expiresAt?: Date
  isActive?: boolean
}

export type UpdateDiscountCodeInput = Partial<CreateDiscountCodeInput>

export interface DiscountValidationResult {
  valid: boolean
  discount?: DiscountCode
  discountAmount?: number
  error?: string
}

export interface DiscountListOptions {
  limit?: number
  offset?: number
  isActive?: boolean
  search?: string
  sortBy?: 'code' | 'createdAt' | 'usageCount' | 'expiresAt'
  sortOrder?: 'asc' | 'desc'
}

export interface DiscountStats {
  totalCodes: number
  activeCodes: number
  expiredCodes: number
  totalUsage: number
  topCodes: {
    code: string
    usageCount: number
    type: DiscountType
    value: number
  }[]
}
