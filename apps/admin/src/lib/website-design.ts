/**
 * Website Design utilities and plan enforcement
 */

import type { Tenant, Plan } from '@madebuy/shared'

/**
 * Website Design feature plan requirements:
 * - Free/Starter: Colors only
 * - Maker: Colors + Banner + Typography + Layout
 * - Professional/Studio: All features including Custom Sections + Blog
 */

/**
 * Check if tenant can customize colors (all plans)
 */
export function canCustomizeColors(tenant: Tenant): boolean {
  return true // All plans
}

// Plans that have Maker-level access (layout, banner, typography)
const MAKER_PLUS_PLANS: Plan[] = ['maker', 'professional', 'studio']

// Plans that have Professional-level access (custom sections, blog)
const PROFESSIONAL_PLUS_PLANS: Plan[] = ['professional', 'studio']

/**
 * Check if tenant can customize banner
 */
export function canCustomizeBanner(tenant: Tenant): boolean {
  return MAKER_PLUS_PLANS.includes(tenant.plan)
}

/**
 * Check if tenant can customize typography
 */
export function canCustomizeTypography(tenant: Tenant): boolean {
  return MAKER_PLUS_PLANS.includes(tenant.plan)
}

/**
 * Check if tenant can customize layout
 */
export function canCustomizeLayout(tenant: Tenant): boolean {
  return MAKER_PLUS_PLANS.includes(tenant.plan)
}

/**
 * Check if tenant can use custom sections
 */
export function canUseCustomSections(tenant: Tenant): boolean {
  return PROFESSIONAL_PLUS_PLANS.includes(tenant.plan)
}

/**
 * Check if tenant can use blog
 */
export function canUseBlog(tenant: Tenant): boolean {
  return PROFESSIONAL_PLUS_PLANS.includes(tenant.plan)
}

/**
 * Get website design access level for a tenant
 */
export function getWebsiteDesignAccessLevel(tenant: Tenant): {
  canCustomizeColors: boolean
  canCustomizeBanner: boolean
  canCustomizeTypography: boolean
  canCustomizeLayout: boolean
  canUseCustomSections: boolean
  canUseBlog: boolean
  plan: Plan
  upgradeRequired: boolean
  upgradeTarget?: 'maker' | 'professional'
} {
  const colors = canCustomizeColors(tenant)
  const banner = canCustomizeBanner(tenant)
  const typography = canCustomizeTypography(tenant)
  const layout = canCustomizeLayout(tenant)
  const sections = canUseCustomSections(tenant)
  const blog = canUseBlog(tenant)

  let upgradeRequired = false
  let upgradeTarget: 'maker' | 'professional' | undefined

  if (tenant.plan === 'free') {
    upgradeRequired = true
    upgradeTarget = 'maker'
  }

  return {
    canCustomizeColors: colors,
    canCustomizeBanner: banner,
    canCustomizeTypography: typography,
    canCustomizeLayout: layout,
    canUseCustomSections: sections,
    canUseBlog: blog,
    plan: tenant.plan,
    upgradeRequired,
    upgradeTarget,
  }
}

/**
 * Get upgrade messaging for website design features
 */
export function getWebsiteDesignUpgradeMessage(
  tenant: Tenant,
  feature: 'banner' | 'typography' | 'layout' | 'sections' | 'blog'
): {
  title: string
  description: string
  ctaText: string
  targetPlan: Plan
  price: string
} {
  // Maker features (banner, typography, layout)
  if (feature === 'banner' || feature === 'typography' || feature === 'layout') {
    if (tenant.plan === 'free') {
      return {
        title: 'Unlock Advanced Design Customization',
        description: 'Customize your storefront with hero banners, professional typography, and flexible layouts to match your brand.',
        ctaText: 'Upgrade to Maker',
        targetPlan: 'maker',
        price: '$15/month',
      }
    }
  }

  // Professional features (custom sections, blog)
  if (feature === 'sections' || feature === 'blog') {
    if (tenant.plan === 'free' || tenant.plan === 'maker') {
      return {
        title: 'Unlock Custom Content & Blog',
        description: 'Build unique storefronts with flexible content sections and engage customers with an integrated blog.',
        ctaText: 'Upgrade to Professional',
        targetPlan: 'professional',
        price: '$29/month',
      }
    }
  }

  // Already has access
  return {
    title: 'You Have Full Design Access',
    description: 'Customize your storefront with all available design tools and features.',
    ctaText: 'Continue Designing',
    targetPlan: tenant.plan,
    price: '',
  }
}

/**
 * Website design feature limits by plan
 */
export const WEBSITE_DESIGN_LIMITS: Record<Plan, {
  colors: boolean
  banner: boolean
  typography: boolean
  layout: boolean
  customSections: boolean
  blog: boolean
  maxSections: number
}> = {
  free: {
    colors: true,
    banner: false,
    typography: false,
    layout: false,
    customSections: false,
    blog: false,
    maxSections: 0,
  },
  maker: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: false,
    blog: false,
    maxSections: 10,
  },
  professional: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: true,
    blog: true,
    maxSections: 20,
  },
  studio: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: true,
    blog: true,
    maxSections: Infinity,
  },
}

/**
 * Validate website design update request
 */
export function validateWebsiteDesignUpdate(
  tenant: Tenant,
  updates: {
    primaryColor?: string
    accentColor?: string
    banner?: any
    typography?: string
    layout?: string
  }
): {
  valid: boolean
  error?: string
} {
  // Colors are allowed for all plans
  if (updates.primaryColor || updates.accentColor) {
    // Always valid
  }

  // Check Pro+ features
  if (updates.banner !== undefined && !canCustomizeBanner(tenant)) {
    return {
      valid: false,
      error: 'Banner customization requires Pro plan or higher.',
    }
  }

  if (updates.typography !== undefined && !canCustomizeTypography(tenant)) {
    return {
      valid: false,
      error: 'Typography customization requires Pro plan or higher.',
    }
  }

  if (updates.layout !== undefined && !canCustomizeLayout(tenant)) {
    return {
      valid: false,
      error: 'Layout customization requires Pro plan or higher.',
    }
  }

  return { valid: true }
}
