/**
 * MadeBuy Shared Error Classes
 * Standardized error types for consistent error handling across the platform
 */

/**
 * Base error class for MadeBuy errors
 */
export class MadeBuyError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: unknown,
  ) {
    super(message)
    this.name = 'MadeBuyError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): { error: string; code: string; details?: unknown } {
    const result: { error: string; code: string; details?: unknown } = {
      error: this.message,
      code: this.code,
    }
    if (this.details !== undefined) {
      result.details = this.details
    }
    return result
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends MadeBuyError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`
    super('NOT_FOUND', message, 404, { resource, id })
    this.name = 'NotFoundError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends MadeBuyError {
  constructor(message: string, details?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Conflict error for duplicate resources (409)
 */
export class ConflictError extends MadeBuyError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Duplicate resource error (409)
 */
export class DuplicateError extends MadeBuyError {
  constructor(resource: string, field: string, value: string) {
    super(
      'DUPLICATE',
      `${resource} with ${field} "${value}" already exists`,
      409,
      { resource, field, value },
    )
    this.name = 'DuplicateError'
  }
}

/**
 * Authentication required error (401)
 */
export class UnauthorizedError extends MadeBuyError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Permission denied error (403)
 */
export class ForbiddenError extends MadeBuyError {
  constructor(message: string = 'Permission denied') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends MadeBuyError {
  constructor(retryAfter?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined,
    )
    this.name = 'RateLimitError'
  }
}

/**
 * Insufficient stock error (400)
 */
export class InsufficientStockError extends MadeBuyError {
  constructor(productName: string, requested: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for ${productName}. Requested: ${requested}, Available: ${available}`,
      400,
      { productName, requested, available },
    )
    this.name = 'InsufficientStockError'
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends MadeBuyError {
  constructor(service: string, originalError?: string) {
    super('EXTERNAL_SERVICE_ERROR', `External service error: ${service}`, 502, {
      service,
      originalError,
    })
    this.name = 'ExternalServiceError'
  }
}

/**
 * Subscription/plan limit error (403)
 */
export class SubscriptionLimitError extends MadeBuyError {
  constructor(feature: string, requiredPlan?: string) {
    super(
      'SUBSCRIPTION_LIMIT',
      requiredPlan
        ? `${feature} requires ${requiredPlan} plan or higher`
        : `${feature} limit reached for your current plan`,
      403,
      { feature, requiredPlan },
    )
    this.name = 'SubscriptionLimitError'
  }
}

/**
 * Helper to check if an error is a MadeBuyError
 */
export function isMadeBuyError(error: unknown): error is MadeBuyError {
  return error instanceof MadeBuyError
}

/**
 * Helper to convert any error to a standardized response format
 */
export function toErrorResponse(error: unknown): {
  error: string
  code: string
  statusCode: number
  details?: unknown
} {
  if (isMadeBuyError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    }
  }

  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}
