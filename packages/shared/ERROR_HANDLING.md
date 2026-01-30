# Error Handling Guide

User-friendly error handling for the MadeBuy platform.

## Overview

All error classes now include:
- Technical `message` for logging and debugging
- User-friendly `userMessage` for API responses
- Standard error codes
- Appropriate HTTP status codes

## Usage

### Import Error Classes

```typescript
import {
  ErrorCodes,
  UserMessages,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DuplicateError,
  RateLimitError,
  InsufficientStockError,
  ExternalServiceError,
  SubscriptionLimitError,
  formatErrorResponse,
  toErrorResponse,
} from '@madebuy/shared'
```

### Throwing Errors

```typescript
// Not found error
throw new NotFoundError('Product', productId)

// Validation error with details
throw new ValidationError('Invalid input', {
  email: ['Must be a valid email address'],
  price: ['Must be a positive number'],
})

// Unauthorized error
throw new UnauthorizedError()

// Subscription limit error
throw new SubscriptionLimitError('Unlimited pieces', 'Professional')
```

### In API Routes (Next.js)

```typescript
import { NextResponse } from 'next/server'
import { formatErrorResponse, NotFoundError } from '@madebuy/shared'

export async function GET(request: Request) {
  try {
    const product = await getProduct(id)

    if (!product) {
      throw new NotFoundError('Product', id)
    }

    return NextResponse.json({ product })
  } catch (error) {
    const { error: errorData, statusCode } = formatErrorResponse(error)
    return NextResponse.json(errorData, { status: statusCode })
  }
}
```

### Response Format

When using `formatErrorResponse`, the API returns:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found."
  }
}
```

With appropriate HTTP status code (e.g., 404).

## Error Classes

| Error Class | Status Code | User Message |
|-------------|-------------|--------------|
| `NotFoundError` | 404 | "The requested resource was not found." |
| `ValidationError` | 400 | "Please check your input and try again." |
| `UnauthorizedError` | 401 | "Please log in to continue." |
| `ForbiddenError` | 403 | "You do not have permission to perform this action." |
| `ConflictError` | 409 | "This action conflicts with existing data." |
| `DuplicateError` | 409 | "This item already exists. Please use a different value." |
| `RateLimitError` | 429 | "Too many requests. Please try again later." |
| `InsufficientStockError` | 400 | "Sorry, we don't have enough stock..." |
| `ExternalServiceError` | 502 | "A temporary service issue occurred..." |
| `SubscriptionLimitError` | 403 | "This feature requires the [plan] plan..." |

## Error Codes

```typescript
ErrorCodes.VALIDATION_ERROR
ErrorCodes.NOT_FOUND
ErrorCodes.UNAUTHORIZED
ErrorCodes.FORBIDDEN
ErrorCodes.CONFLICT
ErrorCodes.DUPLICATE
ErrorCodes.RATE_LIMIT_EXCEEDED
ErrorCodes.INSUFFICIENT_STOCK
ErrorCodes.EXTERNAL_SERVICE_ERROR
ErrorCodes.SUBSCRIPTION_LIMIT
ErrorCodes.INTERNAL_ERROR
ErrorCodes.UNKNOWN_ERROR
```

## Helper Functions

### `formatErrorResponse(error: unknown)`

Converts any error to a standardized API response format:

```typescript
{
  error: {
    code: string
    message: string  // User-friendly message
  }
  statusCode: number
}
```

### `toErrorResponse(error: unknown)`

Converts any error to a detailed response format:

```typescript
{
  error: string       // User-friendly message
  code: string
  statusCode: number
  details?: unknown   // Optional error details
}
```

## Best Practices

1. Always use error classes instead of throwing raw strings or Error objects
2. Use `formatErrorResponse` in API routes for consistent error responses
3. Log technical messages (`error.message`) for debugging
4. Return user messages (`error.userMessage`) to clients
5. Include details only when helpful (e.g., validation errors)
6. Never expose sensitive information in user messages
