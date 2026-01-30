/**
 * Tests for error handling utilities
 * Critical for API error responses and user messaging
 */

import { describe, expect, it } from 'vitest'
import {
  ConflictError,
  DuplicateError,
  ExternalServiceError,
  ForbiddenError,
  InsufficientStockError,
  MadeBuyError,
  NotFoundError,
  RateLimitError,
  SubscriptionLimitError,
  UnauthorizedError,
  ValidationError,
  formatErrorResponse,
  isMadeBuyError,
  toErrorResponse,
} from '../errors'

describe('MadeBuyError', () => {
  it('should create error with all properties', () => {
    const error = new MadeBuyError(
      'TEST_ERROR',
      'Technical message',
      400,
      'User-friendly message',
      { detail: 'test' },
    )

    expect(error.code).toBe('TEST_ERROR')
    expect(error.message).toBe('Technical message')
    expect(error.statusCode).toBe(400)
    expect(error.userMessage).toBe('User-friendly message')
    expect(error.details).toEqual({ detail: 'test' })
    expect(error.name).toBe('MadeBuyError')
  })

  it('should default userMessage to message if not provided', () => {
    const error = new MadeBuyError('TEST_ERROR', 'Technical message', 400)

    expect(error.userMessage).toBe('Technical message')
  })

  it('should serialize to JSON properly', () => {
    const error = new MadeBuyError(
      'TEST_ERROR',
      'Technical message',
      400,
      'User message',
      { detail: 'test' },
    )

    const json = error.toJSON()

    expect(json).toEqual({
      error: 'User message',
      code: 'TEST_ERROR',
      details: { detail: 'test' },
    })
  })

  it('should omit details from JSON if undefined', () => {
    const error = new MadeBuyError('TEST_ERROR', 'Message', 400)

    const json = error.toJSON()

    expect(json).toEqual({
      error: 'Message',
      code: 'TEST_ERROR',
    })
    expect(json.details).toBeUndefined()
  })
})

describe('NotFoundError', () => {
  it('should create error with resource and id', () => {
    const error = new NotFoundError('Piece', 'piece-123')

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Piece not found: piece-123')
    expect(error.statusCode).toBe(404)
    expect(error.userMessage).toBe('The requested resource was not found.')
    expect(error.details).toEqual({ resource: 'Piece', id: 'piece-123' })
  })

  it('should create error with resource only', () => {
    const error = new NotFoundError('Order')

    expect(error.message).toBe('Order not found')
    expect(error.details).toEqual({ resource: 'Order', id: undefined })
  })
})

describe('ValidationError', () => {
  it('should create error with field details', () => {
    const error = new ValidationError('Invalid input', {
      email: ['Invalid email format'],
      name: ['Name is required'],
    })

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({
      email: ['Invalid email format'],
      name: ['Name is required'],
    })
  })
})

describe('ConflictError', () => {
  it('should create conflict error', () => {
    const error = new ConflictError('Resource already exists', {
      field: 'slug',
    })

    expect(error.code).toBe('CONFLICT')
    expect(error.statusCode).toBe(409)
    expect(error.userMessage).toBe('This action conflicts with existing data.')
  })
})

describe('DuplicateError', () => {
  it('should create duplicate error with field details', () => {
    const error = new DuplicateError('Piece', 'slug', 'silver-ring')

    expect(error.code).toBe('DUPLICATE')
    expect(error.statusCode).toBe(409)
    expect(error.message).toBe(
      'Piece with slug "silver-ring" already exists',
    )
    expect(error.details).toEqual({
      resource: 'Piece',
      field: 'slug',
      value: 'silver-ring',
    })
  })
})

describe('UnauthorizedError', () => {
  it('should create error with default message', () => {
    const error = new UnauthorizedError()

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Authentication required')
  })

  it('should create error with custom message', () => {
    const error = new UnauthorizedError('Invalid token')

    expect(error.message).toBe('Invalid token')
    expect(error.userMessage).toBe('Please log in to continue.')
  })
})

describe('ForbiddenError', () => {
  it('should create error with default message', () => {
    const error = new ForbiddenError()

    expect(error.code).toBe('FORBIDDEN')
    expect(error.statusCode).toBe(403)
    expect(error.message).toBe('Permission denied')
  })

  it('should create error with custom message', () => {
    const error = new ForbiddenError('Cannot access this resource')

    expect(error.message).toBe('Cannot access this resource')
  })
})

describe('RateLimitError', () => {
  it('should create error without retryAfter', () => {
    const error = new RateLimitError()

    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(error.statusCode).toBe(429)
    expect(error.details).toBeUndefined()
  })

  it('should create error with retryAfter', () => {
    const error = new RateLimitError(60)

    expect(error.details).toEqual({ retryAfter: 60 })
  })
})

describe('InsufficientStockError', () => {
  it('should create error with stock details', () => {
    const error = new InsufficientStockError('Silver Ring', 5, 2)

    expect(error.code).toBe('INSUFFICIENT_STOCK')
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe(
      'Insufficient stock for Silver Ring. Requested: 5, Available: 2',
    )
    expect(error.userMessage).toBe(
      'Sorry, we don\'t have enough stock for "Silver Ring". Only 2 available.',
    )
    expect(error.details).toEqual({
      productName: 'Silver Ring',
      requested: 5,
      available: 2,
    })
  })
})

describe('ExternalServiceError', () => {
  it('should create error with service name', () => {
    const error = new ExternalServiceError('Stripe')

    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(error.statusCode).toBe(502)
    expect(error.details).toEqual({
      service: 'Stripe',
      originalError: undefined,
    })
  })

  it('should create error with original error', () => {
    const error = new ExternalServiceError('Stripe', 'Network timeout')

    expect(error.details).toEqual({
      service: 'Stripe',
      originalError: 'Network timeout',
    })
  })
})

describe('SubscriptionLimitError', () => {
  it('should create error without required plan', () => {
    const error = new SubscriptionLimitError('Product uploads')

    expect(error.code).toBe('SUBSCRIPTION_LIMIT')
    expect(error.statusCode).toBe(403)
    expect(error.message).toBe(
      'Product uploads limit reached for your current plan',
    )
    expect(error.userMessage).toContain('reached your plan')
  })

  it('should create error with required plan', () => {
    const error = new SubscriptionLimitError('AI Captions', 'Professional')

    expect(error.message).toBe('AI Captions requires Professional plan or higher')
    expect(error.userMessage).toContain('requires the Professional plan')
    expect(error.details).toEqual({
      feature: 'AI Captions',
      requiredPlan: 'Professional',
    })
  })
})

describe('isMadeBuyError', () => {
  it('should return true for MadeBuyError instances', () => {
    const error = new NotFoundError('Piece', 'piece-123')

    expect(isMadeBuyError(error)).toBe(true)
  })

  it('should return false for standard Error', () => {
    const error = new Error('Standard error')

    expect(isMadeBuyError(error)).toBe(false)
  })

  it('should return false for non-Error values', () => {
    expect(isMadeBuyError('string')).toBe(false)
    expect(isMadeBuyError(null)).toBe(false)
    expect(isMadeBuyError(undefined)).toBe(false)
  })
})

describe('toErrorResponse', () => {
  it('should convert MadeBuyError to response', () => {
    const error = new NotFoundError('Piece', 'piece-123')
    const response = toErrorResponse(error)

    expect(response).toEqual({
      error: 'The requested resource was not found.',
      code: 'NOT_FOUND',
      statusCode: 404,
      details: { resource: 'Piece', id: 'piece-123' },
    })
  })

  it('should convert standard Error to generic response', () => {
    const error = new Error('Something failed')
    const response = toErrorResponse(error)

    expect(response).toEqual({
      error: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    })
  })

  it('should convert non-Error to unknown error response', () => {
    const response = toErrorResponse('string error')

    expect(response).toEqual({
      error: 'An unexpected error occurred. Please try again later.',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    })
  })

  it('should include details when present', () => {
    const error = new ValidationError('Invalid input', {
      email: ['Required'],
    })
    const response = toErrorResponse(error)

    expect(response.details).toEqual({ email: ['Required'] })
  })
})

describe('formatErrorResponse', () => {
  it('should format MadeBuyError for API', () => {
    const error = new ValidationError('Invalid email')
    const response = formatErrorResponse(error)

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input and try again.',
      },
      statusCode: 400,
    })
  })

  it('should format standard Error for API', () => {
    const error = new Error('Internal error')
    const response = formatErrorResponse(error)

    expect(response).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
      statusCode: 500,
    })
  })
})
