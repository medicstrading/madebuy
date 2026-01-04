import { NextResponse } from 'next/server'
import { getCurrentTenant } from './session'
import { checkFeatureAccess, checkCanAddPiece, checkCanAddMedia } from './subscription-check'
import type { Tenant, TenantFeatures } from '@madebuy/shared'

/**
 * Feature Gate Middleware
 *
 * Provides easy-to-use functions for API routes to enforce subscription limits
 * and feature access. These functions throw specific errors that can be caught
 * and returned as proper HTTP responses.
 */

// Custom error classes for feature gating
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class FeatureGatedError extends Error {
  public requiredPlan?: string
  public upgradeRequired: boolean = true

  constructor(message: string, requiredPlan?: string) {
    super(message)
    this.name = 'FeatureGatedError'
    this.requiredPlan = requiredPlan
  }
}

export class QuotaExceededError extends Error {
  public requiredPlan?: string
  public upgradeRequired: boolean = true

  constructor(message: string, requiredPlan?: string) {
    super(message)
    this.name = 'QuotaExceededError'
    this.requiredPlan = requiredPlan
  }
}

/**
 * Require a specific feature to be enabled for the tenant
 * Throws FeatureGatedError if the feature is not available
 *
 * @example
 * const tenant = await requireFeature('socialPublishing')
 */
export async function requireFeature(feature: keyof TenantFeatures): Promise<Tenant> {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    throw new UnauthorizedError()
  }

  const access = checkFeatureAccess(tenant, feature)

  if (!access.allowed) {
    throw new FeatureGatedError(
      access.message || `This feature requires an upgraded plan`,
      access.requiredPlan
    )
  }

  return tenant
}

/**
 * Require that the tenant can add another piece/product
 * Throws QuotaExceededError if the limit is reached
 *
 * @example
 * const tenant = await requirePieceQuota()
 */
export async function requirePieceQuota(): Promise<Tenant> {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    throw new UnauthorizedError()
  }

  const check = await checkCanAddPiece(tenant)

  if (!check.allowed) {
    throw new QuotaExceededError(
      check.message || 'Product limit reached',
      check.requiredPlan
    )
  }

  return tenant
}

/**
 * Require that the tenant can add more media to a piece
 * Throws QuotaExceededError if the limit is reached
 *
 * @example
 * const tenant = await requireMediaQuota(currentMediaCount)
 */
export async function requireMediaQuota(currentMediaCount: number): Promise<Tenant> {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    throw new UnauthorizedError()
  }

  const check = checkCanAddMedia(tenant, currentMediaCount)

  if (!check.allowed) {
    throw new QuotaExceededError(
      check.message || 'Media limit reached',
      check.requiredPlan
    )
  }

  return tenant
}

/**
 * Convert a feature gate error to an appropriate NextResponse
 *
 * @example
 * try {
 *   const tenant = await requireFeature('socialPublishing')
 * } catch (error) {
 *   return handleFeatureGateError(error)
 * }
 */
export function handleFeatureGateError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (error instanceof FeatureGatedError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'FEATURE_GATED',
        upgradeRequired: true,
        requiredPlan: error.requiredPlan,
      },
      { status: 403 }
    )
  }

  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'QUOTA_EXCEEDED',
        upgradeRequired: true,
        requiredPlan: error.requiredPlan,
      },
      { status: 403 }
    )
  }

  // Unknown error - rethrow
  throw error
}

/**
 * Wrapper function to add feature gating to an API route handler
 *
 * @example
 * export const POST = withFeatureGate('socialPublishing', async (request, tenant) => {
 *   // Handler code here
 * })
 */
export function withFeatureGate<T extends (...args: any[]) => Promise<NextResponse>>(
  feature: keyof TenantFeatures,
  handler: (request: Request, tenant: Tenant) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const tenant = await requireFeature(feature)
      return await handler(request, tenant)
    } catch (error) {
      return handleFeatureGateError(error)
    }
  }
}

/**
 * Check if tenant can access a feature (non-throwing version)
 * Returns the tenant if allowed, null otherwise
 */
export async function canAccessFeature(
  feature: keyof TenantFeatures
): Promise<{ tenant: Tenant; allowed: true } | { tenant: null; allowed: false; message: string }> {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    return { tenant: null, allowed: false, message: 'Unauthorized' }
  }

  const access = checkFeatureAccess(tenant, feature)

  if (!access.allowed) {
    return { tenant: null, allowed: false, message: access.message || 'Feature not available' }
  }

  return { tenant, allowed: true }
}
