/**
 * Marketplace utilities and subscription enforcement
 */

import type { Tenant, Plan } from '@madebuy/shared'

/**
 * Check if tenant can access marketplace listing feature
 */
export function canAccessMarketplace(tenant: Tenant): boolean {
  return tenant.features.marketplaceListing || false
}

/**
 * Check if tenant can use featured placements
 */
export function canAccessFeaturedPlacements(tenant: Tenant): boolean {
  return tenant.features.marketplaceFeatured || false
}

/**
 * Get marketplace access level for a tenant
 */
export function getMarketplaceAccessLevel(tenant: Tenant): {
  canList: boolean
  canFeature: boolean
  plan: Plan
  upgradeRequired: boolean
  upgradeTarget?: 'pro' | 'business'
} {
  const canList = canAccessMarketplace(tenant)
  const canFeature = canAccessFeaturedPlacements(tenant)

  let upgradeRequired = false
  let upgradeTarget: 'pro' | 'business' | undefined

  if (!canList) {
    upgradeRequired = true
    upgradeTarget = 'pro'
  } else if (!canFeature) {
    upgradeRequired = true
    upgradeTarget = 'business'
  }

  return {
    canList,
    canFeature,
    plan: tenant.plan,
    upgradeRequired,
    upgradeTarget,
  }
}

/**
 * Get plan features for marketplace
 */
export function getPlanFeatures(plan: Plan): {
  marketplaceListing: boolean
  marketplaceFeatured: boolean
  maxMarketplaceProducts?: number
} {
  switch (plan) {
    case 'free':
      return {
        marketplaceListing: false,
        marketplaceFeatured: false,
        maxMarketplaceProducts: 0,
      }
    case 'pro':
      return {
        marketplaceListing: true,
        marketplaceFeatured: false,
        maxMarketplaceProducts: undefined, // Unlimited
      }
    case 'business':
    case 'enterprise':
      return {
        marketplaceListing: true,
        marketplaceFeatured: true,
        maxMarketplaceProducts: undefined, // Unlimited
      }
    default:
      return {
        marketplaceListing: false,
        marketplaceFeatured: false,
        maxMarketplaceProducts: 0,
      }
  }
}

/**
 * Get upgrade messaging for marketplace features
 */
export function getMarketplaceUpgradeMessage(tenant: Tenant): {
  title: string
  description: string
  ctaText: string
  targetPlan: Plan
  price: string
} {
  const access = getMarketplaceAccessLevel(tenant)

  if (!access.canList) {
    return {
      title: 'Unlock Marketplace Access',
      description: 'List your products in the MadeBuy marketplace and reach thousands of buyers. No transaction fees, ever.',
      ctaText: 'Upgrade to Pro',
      targetPlan: 'pro',
      price: '$29/month',
    }
  }

  if (!access.canFeature) {
    return {
      title: 'Get Featured Placements',
      description: 'Boost your visibility with homepage hero spots and category featured listings.',
      ctaText: 'Upgrade to Business',
      targetPlan: 'business',
      price: '$79/month',
    }
  }

  // Already has all features
  return {
    title: 'You Have Full Marketplace Access',
    description: 'List unlimited products and use featured placements to grow your business.',
    ctaText: 'Manage Listings',
    targetPlan: tenant.plan,
    price: '',
  }
}

/**
 * Marketplace feature limits by plan
 */
export const MARKETPLACE_LIMITS = {
  free: {
    maxProducts: 10,
    marketplaceListing: false,
    marketplaceFeatured: false,
    customDomain: false,
  },
  pro: {
    maxProducts: Infinity,
    marketplaceListing: true,
    marketplaceFeatured: false,
    customDomain: true,
  },
  business: {
    maxProducts: Infinity,
    marketplaceListing: true,
    marketplaceFeatured: true,
    customDomain: true,
    featuredCreditsPerMonth: 3, // 3 featured placements per month
  },
  enterprise: {
    maxProducts: Infinity,
    marketplaceListing: true,
    marketplaceFeatured: true,
    customDomain: true,
    featuredCreditsPerMonth: 10, // 10 featured placements per month
  },
} as const

/**
 * Validate marketplace product listing request
 */
export function validateMarketplaceListing(tenant: Tenant, categories?: string[]): {
  valid: boolean
  error?: string
} {
  // Check subscription access
  if (!canAccessMarketplace(tenant)) {
    return {
      valid: false,
      error: 'Marketplace listing requires Pro plan or higher. Please upgrade to list products.',
    }
  }

  // Validate categories
  if (categories && categories.length === 0) {
    return {
      valid: false,
      error: 'At least one marketplace category is required',
    }
  }

  // Check if categories are valid (optional - can be implemented later)
  // const validCategories = MARKETPLACE_CATEGORIES.map(c => c.slug)
  // if (categories && categories.some(cat => !validCategories.includes(cat))) {
  //   return {
  //     valid: false,
  //     error: 'Invalid marketplace category selected'
  //   }
  // }

  return { valid: true }
}

/**
 * Check if tenant can create featured placement
 */
export function canCreateFeaturedPlacement(tenant: Tenant, currentMonthPlacements: number): {
  canCreate: boolean
  reason?: string
  limit?: number
} {
  if (!canAccessFeaturedPlacements(tenant)) {
    return {
      canCreate: false,
      reason: 'Featured placements require Business plan or higher',
    }
  }

  const limits = MARKETPLACE_LIMITS[tenant.plan]
  const monthlyLimit = 'featuredCreditsPerMonth' in limits ? limits.featuredCreditsPerMonth : 0

  if (currentMonthPlacements >= monthlyLimit) {
    return {
      canCreate: false,
      reason: `Monthly featured placement limit reached (${monthlyLimit})`,
      limit: monthlyLimit,
    }
  }

  return {
    canCreate: true,
    limit: monthlyLimit,
  }
}
