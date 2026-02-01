import { describe, expect, it, vi } from 'vitest'
import { generateIdempotencyKey, withRetry } from '../retry'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await withRetry(fn, { baseDelayMs: 10 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('respects shouldRetry option', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'))

    await expect(withRetry(fn, { shouldRetry: () => false })).rejects.toThrow(
      'non-retryable',
    )
    expect(fn).toHaveBeenCalledTimes(1) // no retries
  })

  it('uses exponential backoff with max delay', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const start = Date.now()

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 150 }),
    ).rejects.toThrow('fail')

    const elapsed = Date.now() - start
    // Should be at least 100ms (first retry) + 150ms (second retry capped)
    expect(elapsed).toBeGreaterThanOrEqual(200)
  })
})

describe('generateIdempotencyKey', () => {
  it('generates key with prefix and parts', () => {
    const key = generateIdempotencyKey('stripe', 'charge', 'cust_123')
    expect(key).toMatch(/^stripe_charge_cust_123_\d+$/)
  })

  it('generates unique keys on subsequent calls', () => {
    const key1 = generateIdempotencyKey('test', 'op1')
    const key2 = generateIdempotencyKey('test', 'op1')
    expect(key1).not.toBe(key2)
  })
})
