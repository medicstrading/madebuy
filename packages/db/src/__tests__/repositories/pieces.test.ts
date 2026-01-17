/**
 * Tests for pieces repository
 * Covers CRUD operations, stock tracking, and variant management
 */

import { beforeEach, describe, expect, it } from 'vitest'
import * as pieces from '../../repositories/pieces'
import { getMockCollectionData, seedMockCollection } from '../setup'

describe('Pieces Repository', () => {
  const tenantId = 'tenant-123'

  const mockPieceData = {
    id: 'piece-456',
    tenantId,
    name: 'Silver Ring',
    slug: 'silver-ring',
    description: 'A beautiful silver ring',
    price: 99.99,
    currency: 'AUD',
    stock: 10,
    lowStockThreshold: 3,
    status: 'available' as const,
    category: 'Rings',
    tags: ['silver', 'jewelry'],
    mediaIds: ['media-1', 'media-2'],
    isFeatured: false,
    isPublishedToWebsite: true,
    hasVariants: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const mockVariantPiece = {
    ...mockPieceData,
    id: 'piece-789',
    name: 'T-Shirt',
    slug: 't-shirt',
    hasVariants: true,
    stock: undefined,
    variantOptions: [
      { name: 'Size', values: ['S', 'M', 'L'] },
      { name: 'Color', values: ['Red', 'Blue'] },
    ],
    variants: [
      {
        id: 'variant-1',
        options: { Size: 'S', Color: 'Red' },
        sku: 'TSH-S-RED',
        price: 29.99,
        stock: 5,
        isAvailable: true,
      },
      {
        id: 'variant-2',
        options: { Size: 'M', Color: 'Blue' },
        sku: 'TSH-M-BLUE',
        price: 29.99,
        stock: 0,
        isAvailable: false,
      },
    ],
  }

  describe('createPiece', () => {
    it('should create a new piece with default values', async () => {
      const piece = await pieces.createPiece(tenantId, {
        name: 'New Ring',
        description: 'A new ring',
        price: 149.99,
        stock: 5,
        status: 'draft',
      })

      expect(piece).toBeDefined()
      expect(piece.id).toBeDefined()
      expect(piece.tenantId).toBe(tenantId)
      expect(piece.name).toBe('New Ring')
      expect(piece.slug).toBe('new-ring')
      expect(piece.price).toBe(149.99)
      expect(piece.status).toBe('draft')
      expect(piece.currency).toBe('AUD')
      expect(piece.isFeatured).toBe(false)
      expect(piece.mediaIds).toEqual([])
    })

    it('should create piece with variants', async () => {
      const piece = await pieces.createPiece(tenantId, {
        name: 'Shirt',
        price: 49.99,
        status: 'available',
        hasVariants: true,
        variantOptions: [{ name: 'Size', values: ['S', 'M', 'L'] }],
        variants: [
          {
            options: { Size: 'S' },
            sku: 'SH-S',
            stock: 10,
            isAvailable: true,
          },
        ],
      })

      expect(piece.hasVariants).toBe(true)
      expect(piece.variants).toHaveLength(1)
      expect(piece.variants?.[0].id).toBeDefined()
      expect(piece.variants?.[0].sku).toBe('SH-S')
    })

    it('should generate slug from name', async () => {
      const piece = await pieces.createPiece(tenantId, {
        name: 'Beautiful Silver & Gold Ring!',
        price: 199.99,
        status: 'draft',
      })

      expect(piece.slug).toBe('beautiful-silver-gold-ring')
    })
  })

  describe('getPiece', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [mockPieceData])
    })

    it('should return piece when found', async () => {
      const piece = await pieces.getPiece(tenantId, 'piece-456')

      expect(piece).toBeDefined()
      expect(piece?.id).toBe('piece-456')
      expect(piece?.name).toBe('Silver Ring')
    })

    it('should return null when piece not found', async () => {
      const piece = await pieces.getPiece(tenantId, 'non-existent')

      expect(piece).toBeNull()
    })

    it('should not return piece from different tenant', async () => {
      const piece = await pieces.getPiece('other-tenant', 'piece-456')

      expect(piece).toBeNull()
    })
  })

  describe('getPieceBySlug', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [mockPieceData])
    })

    it('should return piece by slug', async () => {
      const piece = await pieces.getPieceBySlug(tenantId, 'silver-ring')

      expect(piece).toBeDefined()
      expect(piece?.slug).toBe('silver-ring')
    })
  })

  describe('listPieces', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [
        mockPieceData,
        {
          ...mockPieceData,
          id: 'piece-2',
          name: 'Gold Ring',
          slug: 'gold-ring',
          status: 'draft',
        },
        {
          ...mockPieceData,
          id: 'piece-3',
          name: 'Necklace',
          slug: 'necklace',
          isFeatured: true,
        },
      ])
    })

    it('should list all pieces for tenant', async () => {
      const list = await pieces.listPieces(tenantId)

      expect(list).toHaveLength(3)
    })

    it('should filter by status', async () => {
      const list = await pieces.listPieces(tenantId, { status: 'available' })

      expect(list).toHaveLength(2)
      expect(list.every((p) => p.status === 'available')).toBe(true)
    })

    it('should filter by featured', async () => {
      const list = await pieces.listPieces(tenantId, { isFeatured: true })

      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('Necklace')
    })

    it('should apply pagination', async () => {
      const list = await pieces.listPieces(tenantId, { limit: 2, offset: 0 })

      expect(list).toHaveLength(2)
    })
  })

  describe('updatePiece', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [mockPieceData])
    })

    it('should update piece fields', async () => {
      await pieces.updatePiece(tenantId, 'piece-456', {
        name: 'Updated Ring',
        price: 149.99,
      })

      const data = getMockCollectionData('pieces')
      const updated = data.find((p) => p.id === 'piece-456')

      expect(updated?.name).toBe('Updated Ring')
      expect(updated?.price).toBe(149.99)
      expect(updated?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('deletePiece', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [mockPieceData])
    })

    it('should delete piece', async () => {
      await pieces.deletePiece(tenantId, 'piece-456')

      const data = getMockCollectionData('pieces')
      expect(data).toHaveLength(0)
    })
  })

  describe('Stock Management', () => {
    describe('getAvailableStock', () => {
      it('should return piece-level stock for non-variant product', async () => {
        seedMockCollection('pieces', [mockPieceData])

        const stock = await pieces.getAvailableStock(tenantId, 'piece-456')

        expect(stock).toBe(10)
      })

      it('should return variant stock for variant product', async () => {
        seedMockCollection('pieces', [mockVariantPiece])

        const stock = await pieces.getAvailableStock(
          tenantId,
          'piece-789',
          'variant-1',
        )

        expect(stock).toBe(5)
      })

      it('should return undefined for non-existent piece', async () => {
        seedMockCollection('pieces', [])

        const stock = await pieces.getAvailableStock(tenantId, 'non-existent')

        expect(stock).toBeUndefined()
      })
    })

    describe('hasStock', () => {
      beforeEach(() => {
        seedMockCollection('pieces', [mockPieceData])
      })

      it('should return true when sufficient stock', async () => {
        const has = await pieces.hasStock(tenantId, 'piece-456', 5)

        expect(has).toBe(true)
      })

      it('should return false when insufficient stock', async () => {
        const has = await pieces.hasStock(tenantId, 'piece-456', 15)

        expect(has).toBe(false)
      })

      it('should return true for unlimited stock (undefined)', async () => {
        seedMockCollection('pieces', [{ ...mockPieceData, stock: undefined }])

        const has = await pieces.hasStock(tenantId, 'piece-456', 1000)

        expect(has).toBe(true)
      })
    })

    describe('getVariant', () => {
      beforeEach(() => {
        seedMockCollection('pieces', [mockVariantPiece])
      })

      it('should return variant when found', async () => {
        const variant = await pieces.getVariant(
          tenantId,
          'piece-789',
          'variant-1',
        )

        expect(variant).toBeDefined()
        expect(variant?.sku).toBe('TSH-S-RED')
        expect(variant?.options).toEqual({ Size: 'S', Color: 'Red' })
      })

      it('should return null when variant not found', async () => {
        const variant = await pieces.getVariant(
          tenantId,
          'piece-789',
          'non-existent',
        )

        expect(variant).toBeNull()
      })
    })

    describe('updateVariantStock', () => {
      beforeEach(() => {
        seedMockCollection('pieces', [mockVariantPiece])
      })

      it('should update variant stock', async () => {
        const result = await pieces.updateVariantStock(
          tenantId,
          'piece-789',
          'variant-1',
          -2,
        )

        expect(result).toBe(true)

        const data = getMockCollectionData('pieces')
        const piece = data.find((p) => p.id === 'piece-789')
        expect(piece?.variants[0].stock).toBe(3)
      })

      it('should not allow negative stock', async () => {
        const result = await pieces.updateVariantStock(
          tenantId,
          'piece-789',
          'variant-1',
          -10,
        )

        expect(result).toBe(false)
      })
    })
  })

  describe('Low Stock Alerts', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [
        mockPieceData,
        { ...mockPieceData, id: 'piece-low', stock: 2, lowStockThreshold: 5 },
        {
          ...mockPieceData,
          id: 'piece-out',
          stock: 0,
          lowStockThreshold: undefined,
        },
      ])
    })

    it('should get low stock pieces', async () => {
      const lowStock = await pieces.getLowStockPieces(tenantId)

      expect(lowStock).toHaveLength(1)
      expect(lowStock[0].stock).toBe(2)
    })

    it('should check low stock status', async () => {
      const status = await pieces.checkLowStock(tenantId, 'piece-low')

      expect(status?.isLowStock).toBe(true)
      expect(status?.stock).toBe(2)
      expect(status?.threshold).toBe(5)
    })

    it('should return null if no threshold set', async () => {
      seedMockCollection('pieces', [
        { ...mockPieceData, lowStockThreshold: undefined },
      ])

      const status = await pieces.checkLowStock(tenantId, 'piece-456')

      expect(status).toBeNull()
    })
  })

  describe('Media Management', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [mockPieceData])
    })

    it('should add media to piece', async () => {
      await pieces.addMediaToPiece(tenantId, 'piece-456', 'media-3')

      const data = getMockCollectionData('pieces')
      const piece = data.find((p) => p.id === 'piece-456')

      expect(piece?.mediaIds).toContain('media-3')
    })

    it('should remove media from piece', async () => {
      await pieces.removeMediaFromPiece(tenantId, 'piece-456', 'media-1')

      const data = getMockCollectionData('pieces')
      const piece = data.find((p) => p.id === 'piece-456')

      expect(piece?.mediaIds).not.toContain('media-1')
    })
  })

  describe('countPieces', () => {
    beforeEach(() => {
      seedMockCollection('pieces', [
        mockPieceData,
        { ...mockPieceData, id: 'piece-2' },
        { ...mockPieceData, id: 'piece-3' },
      ])
    })

    it('should count pieces for tenant', async () => {
      const count = await pieces.countPieces(tenantId)

      expect(count).toBe(3)
    })
  })
})
