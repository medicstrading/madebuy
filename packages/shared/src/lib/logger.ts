import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'
// Detect if running in Next.js/webpack environment (browser or SSR)
const isNextJs =
  typeof window !== 'undefined' ||
  (typeof process !== 'undefined' && process.env.NEXT_RUNTIME)

/**
 * Base logger instance configured for the application environment
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  // Only use pino-pretty in development and NOT in Next.js context
  ...(isDev && !isNextJs
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

/**
 * Create a child logger with additional context
 * @param context - Context object to attach to all log entries
 * @returns Child logger instance
 *
 * @example
 * // Named service logger
 * const log = createLogger({ service: 'email' })
 *
 * // Request-scoped logger with tenant context
 * const log = createLogger({
 *   tenantId: tenant.id,
 *   requestId: req.headers.get('x-request-id'),
 *   operation: 'createPiece'
 * })
 * log.info({ pieceId }, 'Piece created successfully')
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Utility to extract common request context from a Request object
 */
export function getRequestContext(req: Request): Record<string, unknown> {
  const headers = req.headers
  return {
    requestId: headers.get('x-request-id') || crypto.randomUUID(),
    userAgent: headers.get('user-agent'),
    method: req.method,
    url: req.url,
  }
}

// Re-export pino types
export type { Logger } from 'pino'
