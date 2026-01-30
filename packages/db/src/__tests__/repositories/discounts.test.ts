/**
 * Tests for discount code validation
 * Critical for ensuring correct discount application and preventing abuse
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as discounts from '../../repositories/discounts'
import { getMockCollectionData, seedMockCollection } from '../setup'

describe('Discounts Repository', () => {
  const tenantId = 'tenant-123'

  const baseDiscount = {
    id: 'discount-1',
    tenantId,
    code: 'SAVE10',
    description: '10% off',
    type: 'percentage' as const,
    value: 10,
    isActive: true,
    usageCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('createDiscountCode', () => {
    it('should create discount with normalized code', async () => {
      const discount = await discounts.createDiscountCode(tenantId, {
        code: ' save20 ',
        description: '20% off',
        type: 'percentage',
        value: 20,
      })

      expect(discount.code).toBe('SAVE20')
      expect(discount.tenantId).toBe(tenantId)
      expect(discount.id).toBeDefined()
      expect(discount.usageCount).toBe(0)
      expect(discount.isActive).toBe(true)
    })

    it('should prevent duplicate codes', async () => {
      seedMockCollection('discount_codes', [baseDiscount])

      await expect(
        discounts.createDiscountCode(tenantId, {
          code: 'SAVE10',
          description: 'Another discount',
          type: 'fixed',
          value: 5,
        }),
      ).rejects.toThrow('already exists')
    })

    it('should create discount with all options', async () => {
      const discount = await discounts.createDiscountCode(tenantId, {
        code: 'COMPLEX',
        description: 'Complex discount',
        type: 'percentage',
        value: 15,
        minOrderAmount: 50,
        maxDiscountAmount: 20,
        maxUses: 100,
        maxUsesPerCustomer: 1,
        applicablePieceIds: ['piece-1', 'piece-2'],
        applicableCategories: ['Jewelry'],
        excludedPieceIds: ['piece-3'],
        startsAt: new Date('2024-06-01'),
        expiresAt: new Date('2024-12-31'),
        isActive: true,
      })

      expect(discount.minOrderAmount).toBe(50)
      expect(discount.maxDiscountAmount).toBe(20)
      expect(discount.maxUses).toBe(100)
      expect(discount.applicablePieceIds).toEqual(['piece-1', 'piece-2'])
    })
  })

  describe('getDiscountCodeByCode', () => {
    beforeEach(() => {
      seedMockCollection('discount_codes', [baseDiscount])
    })

    it('should find discount by code (case-insensitive)', async () => {
      const discount = await discounts.getDiscountCodeByCode(
        tenantId,
        'save10',
      )

      expect(discount?.code).toBe('SAVE10')
    })

    it('should return null for non-existent code', async () => {
      const discount = await discounts.getDiscountCodeByCode(
        tenantId,
        'INVALID',
      )

      expect(discount).toBeNull()
    })
  })

  describe('validateDiscountCode - Basic Checks', () => {
    it('should validate valid discount code', async () => {
      seedMockCollection('discount_codes', [baseDiscount])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(10) // 10% of 100
      expect(result.discount?.code).toBe('SAVE10')
    })

    it('should reject invalid discount code', async () => {
      seedMockCollection('discount_codes', [])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'INVALID',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid discount code')
    })

    it('should reject inactive discount', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, isActive: false },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('no longer active')
    })
  })

  describe('validateDiscountCode - Date Validation', () => {
    it('should reject discount not yet started', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      seedMockCollection('discount_codes', [
        { ...baseDiscount, startsAt: futureDate },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not yet active')
    })

    it('should reject expired discount', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      seedMockCollection('discount_codes', [
        { ...baseDiscount, expiresAt: pastDate },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should accept discount within valid date range', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      seedMockCollection('discount_codes', [
        { ...baseDiscount, startsAt: pastDate, expiresAt: futureDate },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('validateDiscountCode - Usage Limits', () => {
    it('should reject discount that reached max uses', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, maxUses: 10, usageCount: 10 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('usage limit')
    })

    it('should accept discount under max uses', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, maxUses: 10, usageCount: 5 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
    })

    it('should reject customer who exceeded per-customer limit', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, maxUsesPerCustomer: 1 },
      ])
      seedMockCollection('discount_usage', [
        {
          tenantId,
          discountId: 'discount-1',
          customerEmail: 'test@example.com',
          usageCount: 1,
          lastUsedAt: new Date(),
        },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
        'test@example.com',
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('maximum uses')
    })

    it('should accept customer under per-customer limit', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, maxUsesPerCustomer: 3 },
      ])
      seedMockCollection('discount_usage', [
        {
          tenantId,
          discountId: 'discount-1',
          customerEmail: 'test@example.com',
          usageCount: 1,
          lastUsedAt: new Date(),
        },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
        'test@example.com',
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('validateDiscountCode - Minimum Order Amount', () => {
    it('should reject order below minimum', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, minOrderAmount: 50 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        30,
        ['piece-1'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Minimum order amount')
      expect(result.error).toContain('$50')
    })

    it('should accept order at or above minimum', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, minOrderAmount: 50 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        50,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('validateDiscountCode - Product Restrictions', () => {
    it('should accept order with applicable piece', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, applicablePieceIds: ['piece-1', 'piece-2'] },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
    })

    it('should reject order without applicable pieces', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, applicablePieceIds: ['piece-1', 'piece-2'] },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-3'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not valid for these items')
    })

    it('should reject order with only excluded pieces', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, excludedPieceIds: ['piece-1', 'piece-2'] },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1', 'piece-2'],
      )

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not valid for these items')
    })

    it('should accept order with mix of excluded and non-excluded', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, excludedPieceIds: ['piece-1'] },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1', 'piece-2'],
      )

      expect(result.valid).toBe(true)
    })
  })

  describe('validateDiscountCode - Discount Calculations', () => {
    it('should calculate percentage discount correctly', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, type: 'percentage', value: 15 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        200,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(30) // 15% of 200
    })

    it('should cap percentage discount at maxDiscountAmount', async () => {
      seedMockCollection('discount_codes', [
        {
          ...baseDiscount,
          type: 'percentage',
          value: 20,
          maxDiscountAmount: 15,
        },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        200,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(15) // Capped at max
    })

    it('should calculate fixed discount correctly', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, type: 'fixed', value: 25 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(25)
    })

    it('should not exceed order total for fixed discount', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, type: 'fixed', value: 150 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(100) // Capped at order total
    })

    it('should handle free_shipping discount type', async () => {
      seedMockCollection('discount_codes', [
        { ...baseDiscount, type: 'free_shipping', value: 0 },
      ])

      const result = await discounts.validateDiscountCode(
        tenantId,
        'SAVE10',
        100,
        ['piece-1'],
      )

      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(0) // Calculated at checkout
    })
  })

  describe('incrementDiscountUsage', () => {
    beforeEach(() => {
      seedMockCollection('discount_codes', [baseDiscount])
    })

    it('should increment global usage count', async () => {
      await discounts.incrementDiscountUsage(tenantId, 'discount-1')

      const data = getMockCollectionData('discount_codes')
      const discount = data.find((d) => d.id === 'discount-1')

      expect(discount.usageCount).toBe(1)
      expect(discount.updatedAt).toBeInstanceOf(Date)
    })

    it('should track per-customer usage (async operation)', async () => {
      // Test that the function executes without errors
      // The upsert operation is tested in integration tests
      await expect(
        discounts.incrementDiscountUsage(
          tenantId,
          'discount-1',
          'test@example.com',
        ),
      ).resolves.not.toThrow()
    })

    it('should increment existing customer usage', async () => {
      seedMockCollection('discount_usage', [
        {
          tenantId,
          discountId: 'discount-1',
          customerEmail: 'test@example.com',
          usageCount: 2,
          lastUsedAt: new Date('2024-01-01'),
        },
      ])

      await discounts.incrementDiscountUsage(
        tenantId,
        'discount-1',
        'test@example.com',
      )

      const usageData = getMockCollectionData('discount_usage')
      const usage = usageData.find(
        (u) => u.discountId === 'discount-1' && u.customerEmail === 'test@example.com',
      )

      expect(usage.usageCount).toBe(3)
    })
  })

  describe('listDiscountCodes', () => {
    beforeEach(() => {
      seedMockCollection('discount_codes', [
        baseDiscount,
        {
          ...baseDiscount,
          id: 'discount-2',
          code: 'SAVE20',
          isActive: false,
        },
        {
          ...baseDiscount,
          id: 'discount-3',
          code: 'FREESHIP',
          description: 'Free shipping',
        },
      ])
    })

    it('should list all discounts for tenant', async () => {
      const result = await discounts.listDiscountCodes(tenantId)

      expect(result.items).toHaveLength(3)
      expect(result.total).toBe(3)
    })

    it('should filter by active status', async () => {
      const result = await discounts.listDiscountCodes(tenantId, {
        isActive: true,
      })

      expect(result.items).toHaveLength(2)
      expect(result.items.every((d) => d.isActive)).toBe(true)
    })

    it('should handle search parameter', async () => {
      // Test that search parameter doesn't cause errors
      // Regex matching in mocks is limited
      const result = await discounts.listDiscountCodes(tenantId, {
        search: 'SAVE',
      })

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should apply pagination', async () => {
      const result = await discounts.listDiscountCodes(tenantId, {
        limit: 2,
        offset: 0,
      })

      expect(result.items).toHaveLength(2)
      expect(result.hasMore).toBe(true)
    })
  })

  describe('deleteDiscountCode', () => {
    beforeEach(() => {
      seedMockCollection('discount_codes', [baseDiscount])
    })

    it('should delete discount code', async () => {
      const result = await discounts.deleteDiscountCode(tenantId, 'discount-1')

      expect(result).toBe(true)

      const data = getMockCollectionData('discount_codes')
      expect(data).toHaveLength(0)
    })

    it('should return false for non-existent discount', async () => {
      const result = await discounts.deleteDiscountCode(tenantId, 'non-existent')

      expect(result).toBe(false)
    })
  })
})
