/**
 * MadeBuy Shared Error Classes
 * Standardized error types for consistent error handling across the platform
 */

/**
 * Error codes for standardized error handling
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SUBSCRIPTION_LIMIT: 'SUBSCRIPTION_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * User-friendly error messages mapped to error codes
 */
export const UserMessages = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  CONFLICT: 'This action conflicts with existing data.',
  DUPLICATE: 'This item already exists.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  INSUFFICIENT_STOCK: 'Insufficient stock available.',
  EXTERNAL_SERVICE_ERROR: 'A temporary service issue occurred. Please try again in a few moments.',
  SUBSCRIPTION_LIMIT: 'You have reached your plan limit.',
  INTERNAL_ERROR: 'Something went wrong. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again later.',
} as const

/**
 * Base error class for MadeBuy errors
 */
export class MadeBuyError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly userMessage: string
  public readonly details?: unknown

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    userMessage?: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'MadeBuyError'
    this.code = code
    this.statusCode = statusCode
    this.userMessage = userMessage || message
    this.details = details

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): { error: string; code: string; details?: unknown } {
    const result: { error: string; code: string; details?: unknown } = {
      error: this.userMessage,
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
    const userMessage = 'The requested resource was not found.'
    super('NOT_FOUND', message, 404, userMessage, { resource, id })
    this.name = 'NotFoundError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends MadeBuyError {
  constructor(message: string, details?: Record<string, string[]>) {
    const userMessage = 'Please check your input and try again.'
    super('VALIDATION_ERROR', message, 400, userMessage, details)
    this.name = 'ValidationError'
  }
}

/**
 * Conflict error for duplicate resources (409)
 */
export class ConflictError extends MadeBuyError {
  constructor(message: string, details?: unknown) {
    const userMessage = 'This action conflicts with existing data.'
    super('CONFLICT', message, 409, userMessage, details)
    this.name = 'ConflictError'
  }
}

/**
 * Duplicate resource error (409)
 */
export class DuplicateError extends MadeBuyError {
  constructor(resource: string, field: string, value: string) {
    const message = `${resource} with ${field} "${value}" already exists`
    const userMessage = 'This item already exists. Please use a different value.'
    super(
      'DUPLICATE',
      message,
      409,
      userMessage,
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
    const userMessage = 'Please log in to continue.'
    super('UNAUTHORIZED', message, 401, userMessage)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Permission denied error (403)
 */
export class ForbiddenError extends MadeBuyError {
  constructor(message: string = 'Permission denied') {
    const userMessage = 'You do not have permission to perform this action.'
    super('FORBIDDEN', message, 403, userMessage)
    this.name = 'ForbiddenError'
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends MadeBuyError {
  constructor(retryAfter?: number) {
    const message = 'Too many requests. Please try again later.'
    super(
      'RATE_LIMIT_EXCEEDED',
      message,
      429,
      message, // User message same as technical message - already user-friendly
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
    const message = `Insufficient stock for ${productName}. Requested: ${requested}, Available: ${available}`
    const userMessage = `Sorry, we don't have enough stock for "${productName}". Only ${available} available.`
    super(
      'INSUFFICIENT_STOCK',
      message,
      400,
      userMessage,
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
    const message = `External service error: ${service}`
    const userMessage = 'A temporary service issue occurred. Please try again in a few moments.'
    super('EXTERNAL_SERVICE_ERROR', message, 502, userMessage, {
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
    const message = requiredPlan
      ? `${feature} requires ${requiredPlan} plan or higher`
      : `${feature} limit reached for your current plan`
    const userMessage = requiredPlan
      ? `This feature requires the ${requiredPlan} plan. Please upgrade to continue.`
      : `You've reached your plan's limit for this feature. Please upgrade to continue.`
    super(
      'SUBSCRIPTION_LIMIT',
      message,
      403,
      userMessage,
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
      error: error.userMessage, // Use user-friendly message
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      error: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    }
  }

  return {
    error: 'An unexpected error occurred. Please try again later.',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}

/**
 * Format an error for API response (alias for toErrorResponse)
 * Returns user-friendly error message and appropriate status code
 */
export function formatErrorResponse(error: unknown): {
  error: {
    code: string
    message: string
  }
  statusCode: number
} {
  const response = toErrorResponse(error)
  return {
    error: {
      code: response.code,
      message: response.error,
    },
    statusCode: response.statusCode,
  }
}
