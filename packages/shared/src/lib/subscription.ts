import type { Plan, TenantFeatures } from '../types/tenant'

/**
 * Subscription & Plan Limits
 * Centralized configuration for plan tiers and their limits
 */

export interface PlanLimits {
  pieces: number // Max products (-1 = unlimited)
  mediaPerPiece: number // Max images per product
  customDomain: boolean
  socialPublishing: boolean
  aiCaptions: boolean
  priority: 'standard' | 'priority' | 'vip'
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    pieces: 10,
    mediaPerPiece: 5,
    customDomain: false,
    socialPublishing: false,
    aiCaptions: false,
    priority: 'standard',
  },
  pro: {
    pieces: 100,
    mediaPerPiece: 10,
    customDomain: true,
    socialPublishing: true,
    aiCaptions: true,
    priority: 'priority',
  },
  business: {
    pieces: -1, // Unlimited
    mediaPerPiece: 20,
    customDomain: true,
    socialPublishing: true,
    aiCaptions: true,
    priority: 'vip',
  },
  enterprise: {
    pieces: -1, // Unlimited
    mediaPerPiece: 50,
    customDomain: true,
    socialPublishing: true,
    aiCaptions: true,
    priority: 'vip',
  },
}

export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 19, yearly: 190 }, // ~$15.83/mo yearly
  business: { monthly: 39, yearly: 390 }, // ~$32.50/mo yearly
  enterprise: { monthly: 79, yearly: 790 }, // ~$65.83/mo yearly
}

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'Free',
  pro: 'Maker',
  business: 'Pro',
  enterprise: 'Business',
}

/**
 * Get the limits for a specific plan
 */
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

/**
 * Check if a plan can do a specific action
 */
export function canPlanAccess(plan: Plan, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(plan)
  const value = limits[feature]

  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  return true
}

/**
 * Check if adding more pieces would exceed plan limit
 */
export function canAddMorePieces(plan: Plan, currentCount: number): boolean {
  const limits = getPlanLimits(plan)
  if (limits.pieces === -1) return true // Unlimited
  return currentCount < limits.pieces
}

/**
 * Get remaining piece slots
 */
export function getRemainingPieceSlots(plan: Plan, currentCount: number): number {
  const limits = getPlanLimits(plan)
  if (limits.pieces === -1) return Infinity
  return Math.max(0, limits.pieces - currentCount)
}

/**
 * Check if adding more media would exceed plan limit
 */
export function canAddMoreMedia(plan: Plan, currentMediaCount: number): boolean {
  const limits = getPlanLimits(plan)
  return currentMediaCount < limits.mediaPerPiece
}

/**
 * Get the features object for a plan
 */
export function getFeaturesForPlan(plan: Plan): TenantFeatures {
  const limits = getPlanLimits(plan)

  return {
    socialPublishing: limits.socialPublishing,
    aiCaptions: limits.aiCaptions,
    unlimitedPieces: limits.pieces === -1,
    customDomain: limits.customDomain,
  }
}

/**
 * Get required plan for a feature
 */
export function getRequiredPlanForFeature(feature: keyof TenantFeatures): Plan {
  const planOrder: Plan[] = ['free', 'pro', 'business', 'enterprise']

  for (const plan of planOrder) {
    const features = getFeaturesForPlan(plan)
    if (features[feature]) {
      return plan
    }
  }

  return 'enterprise' // Default to highest tier
}

/**
 * Compare plans (returns -1, 0, or 1)
 */
export function comparePlans(planA: Plan, planB: Plan): number {
  const order: Record<Plan, number> = { free: 0, pro: 1, business: 2, enterprise: 3 }
  return order[planA] - order[planB]
}

/**
 * Check if plan upgrade is needed for a feature
 */
export function needsUpgradeFor(currentPlan: Plan, feature: keyof TenantFeatures): boolean {
  const features = getFeaturesForPlan(currentPlan)
  return !features[feature]
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(currentPlan: Plan, feature: keyof TenantFeatures): string | null {
  if (!needsUpgradeFor(currentPlan, feature)) {
    return null
  }

  const requiredPlan = getRequiredPlanForFeature(feature)
  const requiredPlanName = PLAN_NAMES[requiredPlan]

  const featureNames: Record<keyof TenantFeatures, string> = {
    socialPublishing: 'Social publishing',
    aiCaptions: 'AI captions',
    unlimitedPieces: 'Unlimited products',
    customDomain: 'Custom domain',
  }

  return `${featureNames[feature]} requires a ${requiredPlanName} plan or higher. Upgrade to unlock this feature.`
}
