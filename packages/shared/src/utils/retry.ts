interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true,
  } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

export function generateIdempotencyKey(
  prefix: string,
  ...parts: string[]
): string {
  return `${prefix}_${parts.join('_')}_${Date.now()}`
}
