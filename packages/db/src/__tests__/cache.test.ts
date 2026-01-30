/**
 * Tests for cache operations
 * Critical for tenant lookups and performance optimization
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cache } from '../cache'

describe('SimpleCache', () => {
  beforeEach(() => {
    cache.clear()
  })

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      cache.set('key1', { name: 'Test' })
      const result = cache.get<{ name: string }>('key1')

      expect(result).toEqual({ name: 'Test' })
    })

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent')

      expect(result).toBeNull()
    })

    it('should handle different data types', () => {
      cache.set('string', 'hello')
      cache.set('number', 42)
      cache.set('boolean', true)
      cache.set('array', [1, 2, 3])
      cache.set('object', { a: 1, b: 2 })

      expect(cache.get('string')).toBe('hello')
      expect(cache.get('number')).toBe(42)
      expect(cache.get('boolean')).toBe(true)
      expect(cache.get('array')).toEqual([1, 2, 3])
      expect(cache.get('object')).toEqual({ a: 1, b: 2 })
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entry after default TTL', () => {
      vi.useFakeTimers()

      cache.set('key1', 'value1')

      // Should be available immediately
      expect(cache.get('key1')).toBe('value1')

      // Fast-forward 30 seconds (half of default TTL)
      vi.advanceTimersByTime(30000)
      expect(cache.get('key1')).toBe('value1')

      // Fast-forward past 60 seconds (default TTL)
      vi.advanceTimersByTime(31000)
      expect(cache.get('key1')).toBeNull()

      vi.useRealTimers()
    })

    it('should expire entry after custom TTL', () => {
      vi.useFakeTimers()

      cache.set('key1', 'value1', 5000) // 5 second TTL

      expect(cache.get('key1')).toBe('value1')

      // Fast-forward 4 seconds
      vi.advanceTimersByTime(4000)
      expect(cache.get('key1')).toBe('value1')

      // Fast-forward past 5 seconds
      vi.advanceTimersByTime(1001)
      expect(cache.get('key1')).toBeNull()

      vi.useRealTimers()
    })

    it('should allow updating TTL by setting again', () => {
      vi.useFakeTimers()

      cache.set('key1', 'value1', 5000)

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000)

      // Reset TTL by setting again
      cache.set('key1', 'value2', 5000)

      // Fast-forward 4 seconds (would have expired original)
      vi.advanceTimersByTime(4000)
      expect(cache.get('key1')).toBe('value2')

      // Fast-forward past new TTL
      vi.advanceTimersByTime(2000)
      expect(cache.get('key1')).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('invalidate', () => {
    it('should invalidate keys matching prefix pattern', () => {
      cache.set('tenant:123', { name: 'Tenant 123' })
      cache.set('tenant:456', { name: 'Tenant 456' })
      cache.set('user:789', { name: 'User 789' })

      cache.invalidate('tenant:')

      expect(cache.get('tenant:123')).toBeNull()
      expect(cache.get('tenant:456')).toBeNull()
      expect(cache.get('user:789')).toEqual({ name: 'User 789' })
    })

    it('should invalidate with specific prefix', () => {
      cache.set('user:123', 'value1')
      cache.set('user:456', 'value2')
      cache.set('tenant:789', 'value3')

      cache.invalidate('user:123')

      expect(cache.get('user:123')).toBeNull()
      expect(cache.get('user:456')).toEqual('value2')
      expect(cache.get('tenant:789')).toEqual('value3')
    })

    it('should do nothing if no keys match pattern', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.invalidate('non-existent:')

      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
    })

    it('should handle empty cache', () => {
      cache.invalidate('anything:')

      const stats = cache.getStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.getStats().size).toBe(3)

      cache.clear()

      expect(cache.getStats().size).toBe(0)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
      expect(cache.get('key3')).toBeNull()
    })

    it('should handle clearing empty cache', () => {
      cache.clear()

      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('tenant:123', 'tenant data')

      const stats = cache.getStats()

      expect(stats.size).toBe(3)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
      expect(stats.keys).toContain('tenant:123')
    })

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats()

      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })
  })

  describe('Real-world scenarios', () => {
    it('should cache tenant data with prefix pattern', () => {
      const tenant1 = { id: 'tenant-123', name: 'Shop 1', slug: 'shop-1' }
      const tenant2 = { id: 'tenant-456', name: 'Shop 2', slug: 'shop-2' }

      // Cache by ID
      cache.set(`tenant:id:${tenant1.id}`, tenant1)
      cache.set(`tenant:id:${tenant2.id}`, tenant2)

      // Cache by slug
      cache.set(`tenant:slug:${tenant1.slug}`, tenant1)
      cache.set(`tenant:slug:${tenant2.slug}`, tenant2)

      // Retrieve by ID
      expect(cache.get(`tenant:id:${tenant1.id}`)).toEqual(tenant1)

      // Retrieve by slug
      expect(cache.get(`tenant:slug:${tenant1.slug}`)).toEqual(tenant1)

      // Invalidate all tenant cache
      cache.invalidate('tenant:')

      expect(cache.get(`tenant:id:${tenant1.id}`)).toBeNull()
      expect(cache.get(`tenant:slug:${tenant1.slug}`)).toBeNull()
    })

    it('should handle cache updates for modified data', () => {
      const tenant = { id: 'tenant-123', name: 'Original Name' }

      cache.set('tenant:tenant-123', tenant)

      // Modify tenant data
      const updatedTenant = { ...tenant, name: 'Updated Name' }
      cache.set('tenant:tenant-123', updatedTenant)

      const cached = cache.get<typeof tenant>('tenant:tenant-123')
      expect(cached?.name).toBe('Updated Name')
    })

    it('should use custom TTL for short-lived data', () => {
      vi.useFakeTimers()

      // Checkout session cache with 15-minute TTL
      cache.set('checkout:session-123', { items: [] }, 15 * 60 * 1000)

      // Should be available after 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000)
      expect(cache.get('checkout:session-123')).toBeTruthy()

      // Should expire after 15 minutes
      vi.advanceTimersByTime(6 * 60 * 1000)
      expect(cache.get('checkout:session-123')).toBeNull()

      vi.useRealTimers()
    })
  })
})
