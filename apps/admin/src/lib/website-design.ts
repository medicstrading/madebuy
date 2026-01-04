/**
 * Website Design utilities and plan enforcement
 */

import type { Tenant, Plan } from '@madebuy/shared'

/**
 * Website Design feature plan requirements:
 * - Free: Colors only
 * - Pro: Colors + Banner + Typography + Layout
 * - Business: Colors + Banner + Typography + Layout + Custom Sections + Blog
 */

/**
 * Check if tenant can customize colors (all plans)
 */
export function canCustomizeColors(tenant: Tenant): boolean {
  return true // All plans
}

/**
 * Check if tenant can customize banner
 */
export function canCustomizeBanner(tenant: Tenant): boolean {
  return tenant.plan === 'pro' || tenant.plan === 'business' || tenant.plan === 'enterprise'
}

/**
 * Check if tenant can customize typography
 */
export function canCustomizeTypography(tenant: Tenant): boolean {
  return tenant.plan === 'pro' || tenant.plan === 'business' || tenant.plan === 'enterprise'
}

/**
 * Check if tenant can customize layout
 */
export function canCustomizeLayout(tenant: Tenant): boolean {
  return tenant.plan === 'pro' || tenant.plan === 'business' || tenant.plan === 'enterprise'
}

/**
 * Check if tenant can use custom sections
 */
export function canUseCustomSections(tenant: Tenant): boolean {
  return tenant.plan === 'business' || tenant.plan === 'enterprise'
}

/**
 * Check if tenant can use blog
 */
export function canUseBlog(tenant: Tenant): boolean {
  return tenant.plan === 'business' || tenant.plan === 'enterprise'
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
  upgradeTarget?: 'pro' | 'business'
} {
  const colors = canCustomizeColors(tenant)
  const banner = canCustomizeBanner(tenant)
  const typography = canCustomizeTypography(tenant)
  const layout = canCustomizeLayout(tenant)
  const sections = canUseCustomSections(tenant)
  const blog = canUseBlog(tenant)

  let upgradeRequired = false
  let upgradeTarget: 'pro' | 'business' | undefined

  if (tenant.plan === 'free') {
    upgradeRequired = true
    upgradeTarget = 'pro'
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
  const access = getWebsiteDesignAccessLevel(tenant)

  // Pro features (banner, typography, layout)
  if (feature === 'banner' || feature === 'typography' || feature === 'layout') {
    if (tenant.plan === 'free') {
      return {
        title: 'Unlock Advanced Design Customization',
        description: 'Customize your storefront with hero banners, professional typography, and flexible layouts to match your brand.',
        ctaText: 'Upgrade to Maker',
        targetPlan: 'pro',
        price: '$15/month',
      }
    }
  }

  // Business features (custom sections, blog)
  if (feature === 'sections' || feature === 'blog') {
    if (tenant.plan === 'free' || tenant.plan === 'pro') {
      return {
        title: 'Unlock Custom Content & Blog',
        description: 'Build unique storefronts with flexible content sections and engage customers with an integrated blog.',
        ctaText: tenant.plan === 'free' ? 'Upgrade to Professional' : 'Upgrade to Professional',
        targetPlan: 'business',
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
export const WEBSITE_DESIGN_LIMITS = {
  free: {
    colors: true,
    banner: false,
    typography: false,
    layout: false,
    customSections: false,
    blog: false,
    maxSections: 0,
  },
  pro: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: false,
    blog: false,
    maxSections: 0,
  },
  business: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: true,
    blog: true,
    maxSections: 20,
  },
  enterprise: {
    colors: true,
    banner: true,
    typography: true,
    layout: true,
    customSections: true,
    blog: true,
    maxSections: Infinity,
  },
} as const

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
