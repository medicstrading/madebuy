import { pieces } from '@madebuy/db'
import {
  canAddMorePieces,
  canAddMoreMedia,
  needsUpgradeFor,
  getUpgradeMessage,
  PLAN_NAMES,
  getPlanLimits,
} from '@madebuy/shared/src/lib/subscription'
import type { Tenant, TenantFeatures, Plan } from '@madebuy/shared'

/**
 * Subscription Enforcement
 * Server-side checks for plan limits and feature access
 */

export interface SubscriptionCheckResult {
  allowed: boolean
  message?: string
  upgradeRequired?: boolean
  requiredPlan?: Plan
}

/**
 * Check if tenant can add a new piece
 */
export async function checkCanAddPiece(tenant: Tenant): Promise<SubscriptionCheckResult> {
  const currentCount = await pieces.countPieces(tenant.id)

  if (!canAddMorePieces(tenant.plan, currentCount)) {
    const limits = getPlanLimits(tenant.plan)
    return {
      allowed: false,
      message: `You've reached your limit of ${limits.pieces} products on the ${PLAN_NAMES[tenant.plan]} plan. Upgrade to add more products.`,
      upgradeRequired: true,
      requiredPlan: getNextPlan(tenant.plan),
    }
  }

  return { allowed: true }
}

/**
 * Check if tenant can add more media to a piece
 */
export function checkCanAddMedia(tenant: Tenant, currentMediaCount: number): SubscriptionCheckResult {
  if (!canAddMoreMedia(tenant.plan, currentMediaCount)) {
    const limits = getPlanLimits(tenant.plan)
    return {
      allowed: false,
      message: `You've reached your limit of ${limits.mediaPerPiece} images per product on the ${PLAN_NAMES[tenant.plan]} plan.`,
      upgradeRequired: true,
      requiredPlan: getNextPlan(tenant.plan),
    }
  }

  return { allowed: true }
}

/**
 * Check if tenant can use a specific feature
 */
export function checkFeatureAccess(
  tenant: Tenant,
  feature: keyof TenantFeatures
): SubscriptionCheckResult {
  if (needsUpgradeFor(tenant.plan, feature)) {
    return {
      allowed: false,
      message: getUpgradeMessage(tenant.plan, feature) || 'Upgrade required',
      upgradeRequired: true,
      requiredPlan: getRequiredPlanForFeature(feature),
    }
  }

  // Also check the tenant's actual features object (may be grandfathered or custom)
  if (!tenant.features[feature]) {
    return {
      allowed: false,
      message: 'This feature is not available on your current plan.',
      upgradeRequired: true,
    }
  }

  return { allowed: true }
}

/**
 * Check if tenant can list on marketplace
 */
export function checkMarketplaceAccess(tenant: Tenant): SubscriptionCheckResult {
  return checkFeatureAccess(tenant, 'marketplaceListing')
}

/**
 * Check if tenant can use featured placement
 */
export function checkFeaturedAccess(tenant: Tenant): SubscriptionCheckResult {
  return checkFeatureAccess(tenant, 'marketplaceFeatured')
}

/**
 * Check if tenant can use custom domain
 */
export function checkCustomDomainAccess(tenant: Tenant): SubscriptionCheckResult {
  return checkFeatureAccess(tenant, 'customDomain')
}

/**
 * Get tenant's subscription summary
 */
export async function getSubscriptionSummary(tenant: Tenant) {
  const currentPieceCount = await pieces.countPieces(tenant.id)
  const limits = getPlanLimits(tenant.plan)

  return {
    plan: tenant.plan,
    planName: PLAN_NAMES[tenant.plan],
    pieces: {
      current: currentPieceCount,
      limit: limits.pieces,
      remaining: limits.pieces === -1 ? Infinity : Math.max(0, limits.pieces - currentPieceCount),
      isUnlimited: limits.pieces === -1,
    },
    mediaPerPiece: limits.mediaPerPiece,
    features: tenant.features,
    limits,
    subscriptionStatus: tenant.subscriptionStatus || 'active',
  }
}

/**
 * Get the next plan in the upgrade path
 */
function getNextPlan(currentPlan: Plan): Plan {
  const planOrder: Plan[] = ['free', 'pro', 'business', 'enterprise']
  const currentIndex = planOrder.indexOf(currentPlan)

  if (currentIndex < planOrder.length - 1) {
    return planOrder[currentIndex + 1]
  }

  return currentPlan
}

/**
 * Get required plan for a feature (imported from shared)
 */
function getRequiredPlanForFeature(feature: keyof TenantFeatures): Plan {
  const planOrder: Plan[] = ['free', 'pro', 'business', 'enterprise']

  for (const plan of planOrder) {
    const features = getFeaturesForPlan(plan)
    if (features[feature]) {
      return plan
    }
  }

  return 'enterprise'
}

function getFeaturesForPlan(plan: Plan) {
  const limits = getPlanLimits(plan)
  return {
    socialPublishing: limits.socialPublishing,
    aiCaptions: limits.aiCaptions,
    multiChannelOrders: plan !== 'free',
    advancedAnalytics: limits.advancedAnalytics,
    unlimitedPieces: limits.pieces === -1,
    customDomain: limits.customDomain,
    marketplaceListing: limits.marketplaceListing,
    marketplaceFeatured: limits.marketplaceFeatured,
  }
}
