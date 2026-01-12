/**
 * Tests for bulk operations repository
 * Covers all bulk operations with tenant isolation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { seedMockCollection, getMockCollectionData } from '../setup'
import * as bulk from '../../repositories/bulk'

describe('Bulk Repository', () => {
  const tenantId = 'tenant-123'
  const otherTenantId = 'tenant-other'

  const mockPieces = [
    {
      id: 'piece-1',
      tenantId,
      name: 'Silver Ring',
      status: 'draft',
      price: 100,
      stock: 10,
      category: 'Jewelry',
      tags: ['silver', 'ring'],
      isFeatured: false,
      isPublishedToWebsite: false,
    },
    {
      id: 'piece-2',
      tenantId,
      name: 'Gold Necklace',
      status: 'available',
      price: 200,
      stock: 5,
      category: 'Jewelry',
      tags: ['gold'],
      isFeatured: true,
      isPublishedToWebsite: true,
    },
    {
      id: 'piece-3',
      tenantId,
      name: 'Bronze Bracelet',
      status: 'draft',
      price: 50,
      stock: 20,
      category: 'Accessories',
      tags: [],
      isFeatured: false,
      isPublishedToWebsite: false,
    },
    // Different tenant's piece - should not be affected
    {
      id: 'piece-other',
      tenantId: otherTenantId,
      name: 'Other Item',
      status: 'draft',
      price: 999,
      stock: 100,
      category: 'Other',
      tags: [],
      isFeatured: false,
      isPublishedToWebsite: false,
    },
  ]

  beforeEach(() => {
    seedMockCollection('pieces', [...mockPieces])
  })

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple pieces', async () => {
      const result = await bulk.bulkUpdateStatus(
        tenantId,
        ['piece-1', 'piece-3'],
        'available'
      )

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')
      const piece3 = pieces.find(p => p.id === 'piece-3')

      expect(piece1?.status).toBe('available')
      expect(piece3?.status).toBe('available')
    })

    it('should only update pieces belonging to tenant', async () => {
      const result = await bulk.bulkUpdateStatus(
        tenantId,
        ['piece-1', 'piece-other'],
        'sold'
      )

      // Only piece-1 should be updated (piece-other belongs to different tenant)
      expect(result.affected).toBe(1)

      const pieces = getMockCollectionData('pieces')
      const otherPiece = pieces.find(p => p.id === 'piece-other')

      expect(otherPiece?.status).toBe('draft') // Unchanged
    })
  })

  describe('bulkDelete', () => {
    it('should delete multiple pieces', async () => {
      const result = await bulk.bulkDelete(tenantId, ['piece-1', 'piece-2'])

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)

      const pieces = getMockCollectionData('pieces')
      expect(pieces.find(p => p.id === 'piece-1')).toBeUndefined()
      expect(pieces.find(p => p.id === 'piece-2')).toBeUndefined()
      expect(pieces.find(p => p.id === 'piece-3')).toBeDefined() // Not deleted
    })

    it('should only delete pieces belonging to tenant', async () => {
      const result = await bulk.bulkDelete(tenantId, ['piece-1', 'piece-other'])

      expect(result.affected).toBe(1)

      const pieces = getMockCollectionData('pieces')
      expect(pieces.find(p => p.id === 'piece-other')).toBeDefined() // Not deleted
    })
  })

  describe('bulkUpdatePrices', () => {
    it('should increase by percentage', async () => {
      const result = await bulk.bulkUpdatePrices(
        tenantId,
        ['piece-1', 'piece-2'],
        { type: 'percentage', value: 10, direction: 'increase' }
      )

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')
      const piece2 = pieces.find(p => p.id === 'piece-2')

      expect(piece1?.price).toBe(110) // 100 + 10%
      expect(piece2?.price).toBe(220) // 200 + 10%
    })

    it('should decrease by percentage', async () => {
      const result = await bulk.bulkUpdatePrices(
        tenantId,
        ['piece-1'],
        { type: 'percentage', value: 50, direction: 'decrease' }
      )

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')

      expect(piece1?.price).toBe(50) // 100 - 50%
    })

    it('should increase by fixed amount', async () => {
      const result = await bulk.bulkUpdatePrices(
        tenantId,
        ['piece-1', 'piece-3'],
        { type: 'fixed', value: 25, direction: 'increase' }
      )

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')
      const piece3 = pieces.find(p => p.id === 'piece-3')

      expect(piece1?.price).toBe(125) // 100 + 25
      expect(piece3?.price).toBe(75) // 50 + 25
    })

    it('should decrease by fixed amount', async () => {
      const result = await bulk.bulkUpdatePrices(
        tenantId,
        ['piece-1'],
        { type: 'fixed', value: 30, direction: 'decrease' }
      )

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')

      expect(piece1?.price).toBe(70) // 100 - 30
    })

    it('should floor at zero (no negative prices)', async () => {
      const result = await bulk.bulkUpdatePrices(
        tenantId,
        ['piece-3'], // price is 50
        { type: 'fixed', value: 100, direction: 'decrease' }
      )

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece3 = pieces.find(p => p.id === 'piece-3')

      expect(piece3?.price).toBe(0) // Cannot go negative
    })
  })

  describe('bulkUpdateStock', () => {
    it('should set stock to specific value', async () => {
      const result = await bulk.bulkUpdateStock(tenantId, ['piece-1', 'piece-2'], 50)

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')
      const piece2 = pieces.find(p => p.id === 'piece-2')

      expect(piece1?.stock).toBe(50)
      expect(piece2?.stock).toBe(50)
    })

    it('should set stock to null for unlimited', async () => {
      const result = await bulk.bulkUpdateStock(tenantId, ['piece-1'], 'unlimited')

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')

      expect(piece1?.stock).toBeNull()
    })
  })

  describe('bulkUpdateCategory', () => {
    it('should update category for all pieces', async () => {
      const result = await bulk.bulkUpdateCategory(
        tenantId,
        ['piece-1', 'piece-2', 'piece-3'],
        'New Category'
      )

      expect(result.success).toBe(true)
      expect(result.affected).toBe(3)

      const pieces = getMockCollectionData('pieces')
      const ourPieces = pieces.filter(p => p.tenantId === tenantId)

      ourPieces.forEach(p => {
        expect(p.category).toBe('New Category')
      })
    })
  })

  describe('bulkAddTags', () => {
    it('should add new tags', async () => {
      const result = await bulk.bulkAddTags(
        tenantId,
        ['piece-1', 'piece-3'],
        ['sale', 'new']
      )

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)
    })
  })

  describe('bulkRemoveTags', () => {
    it('should remove specified tags', async () => {
      const result = await bulk.bulkRemoveTags(
        tenantId,
        ['piece-1'],
        ['silver']
      )

      expect(result.success).toBe(true)
      expect(result.affected).toBe(1)
    })
  })

  describe('bulkSetFeatured', () => {
    it('should set isFeatured to true', async () => {
      const result = await bulk.bulkSetFeatured(tenantId, ['piece-1', 'piece-3'], true)

      expect(result.success).toBe(true)
      expect(result.affected).toBe(2)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')
      const piece3 = pieces.find(p => p.id === 'piece-3')

      expect(piece1?.isFeatured).toBe(true)
      expect(piece3?.isFeatured).toBe(true)
    })

    it('should set isFeatured to false', async () => {
      const result = await bulk.bulkSetFeatured(tenantId, ['piece-2'], false) // piece-2 is featured

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece2 = pieces.find(p => p.id === 'piece-2')

      expect(piece2?.isFeatured).toBe(false)
    })
  })

  describe('bulkSetPublished', () => {
    it('should set isPublishedToWebsite to true', async () => {
      const result = await bulk.bulkSetPublished(tenantId, ['piece-1'], true)

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece1 = pieces.find(p => p.id === 'piece-1')

      expect(piece1?.isPublishedToWebsite).toBe(true)
    })

    it('should set isPublishedToWebsite to false', async () => {
      const result = await bulk.bulkSetPublished(tenantId, ['piece-2'], false) // piece-2 is published

      expect(result.success).toBe(true)

      const pieces = getMockCollectionData('pieces')
      const piece2 = pieces.find(p => p.id === 'piece-2')

      expect(piece2?.isPublishedToWebsite).toBe(false)
    })
  })

  describe('getBulkStats', () => {
    it('should return count by status', async () => {
      const stats = await bulk.getBulkStats(tenantId, ['piece-1', 'piece-2', 'piece-3'])

      expect(stats.total).toBe(3)
      expect(stats.byStatus.draft).toBe(2)
      expect(stats.byStatus.available).toBe(1)
    })

    it('should return count by category', async () => {
      const stats = await bulk.getBulkStats(tenantId, ['piece-1', 'piece-2', 'piece-3'])

      expect(stats.byCategory.Jewelry).toBe(2)
      expect(stats.byCategory.Accessories).toBe(1)
    })

    it('should return price range', async () => {
      const stats = await bulk.getBulkStats(tenantId, ['piece-1', 'piece-2', 'piece-3'])

      expect(stats.priceRange.min).toBe(50) // piece-3
      expect(stats.priceRange.max).toBe(200) // piece-2
      expect(stats.priceRange.avg).toBeCloseTo(116.67, 1) // (100+200+50)/3
    })
  })

  describe('exportPieces', () => {
    it('should export selected pieces in CSV-friendly format', async () => {
      const exported = await bulk.exportPieces(tenantId, ['piece-1'])

      expect(exported).toHaveLength(1)
      expect(exported[0].name).toBe('Silver Ring')
      expect(exported[0].tags).toBe('silver, ring')
      expect(exported[0].isFeatured).toBe('No')
    })

    it('should export all pieces when no ids provided', async () => {
      const exported = await bulk.exportPieces(tenantId)

      expect(exported).toHaveLength(3) // Only tenant's pieces
    })
  })
})
