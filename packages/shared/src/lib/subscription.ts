import type { Plan, TenantFeatures } from '../types/tenant'

/**
 * Subscription & Plan Limits
 * Centralized configuration for plan tiers and their limits
 *
 * Tier Structure (January 2025):
 * - Free/Starter: $0 - Try before you buy
 * - Pro/Maker: $15/mo - Serious hobbyists
 * - Business/Professional: $29/mo - Full-time makers
 * - Enterprise/Studio: $59/mo - Established brands
 */

export interface PlanLimits {
  pieces: number // Max products (-1 = unlimited)
  mediaPerPiece: number // Max images per product
  storageMB: number // Storage limit in MB
  ordersPerMonth: number // Monthly order limit (-1 = unlimited)
  customDomain: boolean
  socialPublishing: boolean
  socialPlatforms: number // Number of social platforms (0, 1, 3, -1 = unlimited)
  aiCaptions: boolean
  aiCaptionsPerMonth: number // AI captions limit per month (-1 = unlimited)
  analytics: 'none' | 'basic' | 'advanced' | 'advanced_plus'
  prioritySupport: boolean
  apiAccess: boolean
  teamMembers: number // Number of team members allowed
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    pieces: 5,
    mediaPerPiece: 3,
    storageMB: 50,
    ordersPerMonth: 10,
    customDomain: false,
    socialPublishing: false,
    socialPlatforms: 0,
    aiCaptions: false,
    aiCaptionsPerMonth: 0,
    analytics: 'none',
    prioritySupport: false,
    apiAccess: false,
    teamMembers: 1,
  },
  maker: {
    pieces: 50,
    mediaPerPiece: 8,
    storageMB: 500,
    ordersPerMonth: -1, // Unlimited
    customDomain: true,
    socialPublishing: true,
    socialPlatforms: 1,
    aiCaptions: true,
    aiCaptionsPerMonth: 20,
    analytics: 'basic',
    prioritySupport: false,
    apiAccess: false,
    teamMembers: 1,
  },
  professional: {
    pieces: 200,
    mediaPerPiece: 15,
    storageMB: 2048, // 2GB
    ordersPerMonth: -1, // Unlimited
    customDomain: true,
    socialPublishing: true,
    socialPlatforms: 3,
    aiCaptions: true,
    aiCaptionsPerMonth: 100,
    analytics: 'advanced',
    prioritySupport: true,
    apiAccess: false,
    teamMembers: 1,
  },
  studio: {
    pieces: -1, // Unlimited
    mediaPerPiece: 30,
    storageMB: 10240, // 10GB
    ordersPerMonth: -1, // Unlimited
    customDomain: true,
    socialPublishing: true,
    socialPlatforms: -1, // Unlimited
    aiCaptions: true,
    aiCaptionsPerMonth: -1, // Unlimited
    analytics: 'advanced_plus',
    prioritySupport: true,
    apiAccess: true,
    teamMembers: 3,
  },
}

export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  maker: { monthly: 15, yearly: 150 }, // Save $30/year
  professional: { monthly: 29, yearly: 290 }, // Save $58/year
  studio: { monthly: 59, yearly: 590 }, // Save $118/year
}

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'Starter',
  maker: 'Maker',
  professional: 'Professional',
  studio: 'Studio',
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
    return value !== 0 && value !== -1 ? true : value === -1
  }
  if (typeof value === 'string') {
    return value !== 'none'
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
    prioritySupport: limits.prioritySupport,
    apiAccess: limits.apiAccess,
    advancedAnalytics: limits.analytics === 'advanced' || limits.analytics === 'advanced_plus',
  }
}

/**
 * Get required plan for a feature
 */
export function getRequiredPlanForFeature(feature: keyof TenantFeatures): Plan {
  const planOrder: Plan[] = ['free', 'maker', 'professional', 'studio']

  for (const plan of planOrder) {
    const features = getFeaturesForPlan(plan)
    if (features[feature]) {
      return plan
    }
  }

  return 'studio' // Default to highest tier
}

/**
 * Compare plans (returns -1, 0, or 1)
 */
export function comparePlans(planA: Plan, planB: Plan): number {
  const order: Record<Plan, number> = { free: 0, maker: 1, professional: 2, studio: 3 }
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
    prioritySupport: 'Priority support',
    apiAccess: 'API access',
    advancedAnalytics: 'Advanced analytics',
    marketplaceSync: 'Marketplace sync',
  }

  return `${featureNames[feature]} requires a ${requiredPlanName} plan or higher. Upgrade to unlock this feature.`
}

/**
 * Check if user can use more AI captions this month
 */
export function canUseAiCaption(plan: Plan, usedThisMonth: number): boolean {
  const limits = getPlanLimits(plan)
  if (!limits.aiCaptions) return false
  if (limits.aiCaptionsPerMonth === -1) return true // Unlimited
  return usedThisMonth < limits.aiCaptionsPerMonth
}

/**
 * Get remaining AI captions for this month
 */
export function getRemainingAiCaptions(plan: Plan, usedThisMonth: number): number {
  const limits = getPlanLimits(plan)
  if (!limits.aiCaptions) return 0
  if (limits.aiCaptionsPerMonth === -1) return Infinity
  return Math.max(0, limits.aiCaptionsPerMonth - usedThisMonth)
}

/**
 * Check if user can connect more social platforms
 */
export function canConnectSocialPlatform(plan: Plan, connectedCount: number): boolean {
  const limits = getPlanLimits(plan)
  if (!limits.socialPublishing) return false
  if (limits.socialPlatforms === -1) return true // Unlimited
  return connectedCount < limits.socialPlatforms
}

/**
 * Get remaining social platform connections
 */
export function getRemainingSocialPlatforms(plan: Plan, connectedCount: number): number {
  const limits = getPlanLimits(plan)
  if (!limits.socialPublishing) return 0
  if (limits.socialPlatforms === -1) return Infinity
  return Math.max(0, limits.socialPlatforms - connectedCount)
}

/**
 * Check if storage limit is exceeded
 */
export function isStorageExceeded(plan: Plan, usedMB: number): boolean {
  const limits = getPlanLimits(plan)
  return usedMB >= limits.storageMB
}

/**
 * Get remaining storage in MB
 */
export function getRemainingStorageMB(plan: Plan, usedMB: number): number {
  const limits = getPlanLimits(plan)
  return Math.max(0, limits.storageMB - usedMB)
}

/**
 * Format storage for display (e.g., "50 MB", "2 GB")
 */
export function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)} GB`
  }
  return `${mb} MB`
}

/**
 * Check if monthly order limit is reached
 */
export function canAcceptMoreOrders(plan: Plan, ordersThisMonth: number): boolean {
  const limits = getPlanLimits(plan)
  if (limits.ordersPerMonth === -1) return true // Unlimited
  return ordersThisMonth < limits.ordersPerMonth
}

/**
 * Get remaining orders for this month
 */
export function getRemainingOrders(plan: Plan, ordersThisMonth: number): number {
  const limits = getPlanLimits(plan)
  if (limits.ordersPerMonth === -1) return Infinity
  return Math.max(0, limits.ordersPerMonth - ordersThisMonth)
}
