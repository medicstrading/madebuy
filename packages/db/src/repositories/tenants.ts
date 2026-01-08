import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type { Tenant, StripeConnectStatus, PayPalConnectStatus, TenantPaymentConfig, OnboardingStep } from '@madebuy/shared'

export async function createTenant(email: string, passwordHash: string, businessName: string): Promise<Tenant> {
  const db = await getDatabase()

  // Generate slug from business name or email
  const slug = (businessName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const tenant: Tenant = {
    id: nanoid(),
    slug,
    email,
    passwordHash,
    businessName,
    primaryColor: '#2563eb',
    accentColor: '#10b981',
    domainStatus: 'none',
    features: {
      socialPublishing: false,
      aiCaptions: false,
      unlimitedPieces: false,
      customDomain: false,
      prioritySupport: false,
      apiAccess: false,
      advancedAnalytics: false,
    },
    plan: 'free',
    onboardingComplete: false,
    onboardingStep: 'domain',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('tenants').insertOne(tenant)
  return tenant
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ id }) as Tenant | null
}

export async function getTenantByEmail(email: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ email }) as Tenant | null
}

export async function getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ customDomain: domain }) as Tenant | null
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({ slug }) as Tenant | null
}

export async function getTenantByStripeAccountId(stripeAccountId: string): Promise<Tenant | null> {
  const db = await getDatabase()
  // Check new paymentConfig structure first, then legacy field
  const tenant = await db.collection('tenants').findOne({
    $or: [
      { 'paymentConfig.stripe.connectAccountId': stripeAccountId },
      { stripeConnectAccountId: stripeAccountId } // Legacy field
    ]
  }) as Tenant | null
  return tenant
}

export async function getTenantByPayPalMerchantId(merchantId: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({
    'paymentConfig.paypal.merchantId': merchantId
  }) as Tenant | null
}

export async function getTenantByStripeCustomerId(stripeCustomerId: string): Promise<Tenant | null> {
  const db = await getDatabase()
  return await db.collection('tenants').findOne({
    stripeCustomerId
  }) as Tenant | null
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  // First try custom domain
  let tenant = await getTenantByCustomDomain(domain)
  if (tenant) return tenant

  // Then try as slug (tenant ID)
  return await getTenantBySlug(domain)
}

export async function updateTenant(
  id: string,
  updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

export async function deleteTenant(id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').deleteOne({ id })
}

/**
 * Update maker type and categories for a tenant
 */
export async function updateMakerSettings(
  id: string,
  settings: {
    makerType?: Tenant['makerType']
    customCategories?: string[]
    customMaterialCategories?: string[]
  }
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id },
    {
      $set: {
        ...settings,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Add a custom category to a tenant's list
 */
export async function addCustomCategory(
  id: string,
  category: string,
  type: 'product' | 'material' = 'product'
): Promise<void> {
  const db = await getDatabase()
  const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
  await db.collection('tenants').updateOne(
    { id },
    {
      $addToSet: { [field]: category },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Remove a custom category from a tenant's list
 */
export async function removeCustomCategory(
  id: string,
  category: string,
  type: 'product' | 'material' = 'product'
): Promise<void> {
  const db = await getDatabase()
  const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
  await db.collection('tenants').updateOne(
    { id },
    {
      $pull: { [field]: category } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Get all tenants without a maker type (for migration)
 */
export async function getTenantsWithoutMakerType(): Promise<Tenant[]> {
  const db = await getDatabase()
  const docs = await db.collection('tenants').find({
    makerType: { $exists: false }
  }).toArray()
  return docs as unknown as Tenant[]
}

/**
 * Migration: Set default maker type for existing tenants
 */
export async function migrateToMakerType(defaultType: Tenant['makerType'] = 'jewelry'): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection('tenants').updateMany(
    { makerType: { $exists: false } },
    {
      $set: {
        makerType: defaultType,
        updatedAt: new Date()
      }
    }
  )
  return result.modifiedCount
}

/**
 * Batch fetch tenants by IDs (for N+1 query optimization)
 * Returns a Map for O(1) lookup
 */
export async function getTenantsByIds(tenantIds: string[]): Promise<Map<string, Tenant>> {
  if (tenantIds.length === 0) return new Map()

  const db = await getDatabase()
  const uniqueIds = [...new Set(tenantIds)]

  const tenantDocs = await db.collection('tenants')
    .find({ id: { $in: uniqueIds } })
    .project({
      id: 1,
      slug: 1,
      businessName: 1,
      storeName: 1,
      location: 1,
      makerType: 1,
    })
    .toArray()

  return new Map(tenantDocs.map(t => [t.id, t as unknown as Tenant]))
}

// =============================================================================
// Payment Provider Configuration
// =============================================================================

/**
 * Update Stripe Connect status for a tenant
 */
export async function updateStripeConnectStatus(
  tenantId: string,
  stripeStatus: StripeConnectStatus
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        'paymentConfig.stripe': stripeStatus,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Update PayPal Connect status for a tenant
 */
export async function updatePayPalConnectStatus(
  tenantId: string,
  paypalStatus: PayPalConnectStatus
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        'paymentConfig.paypal': paypalStatus,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Update enabled payment methods for a tenant
 */
export async function updateEnabledPaymentMethods(
  tenantId: string,
  enabledMethods: TenantPaymentConfig['enabledMethods'],
  defaultMethod?: TenantPaymentConfig['defaultMethod']
): Promise<void> {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    'paymentConfig.enabledMethods': enabledMethods,
    updatedAt: new Date(),
  }
  if (defaultMethod !== undefined) {
    update['paymentConfig.defaultMethod'] = defaultMethod
  }
  await db.collection('tenants').updateOne(
    { id: tenantId },
    { $set: update }
  )
}

/**
 * Update the fallback message for when no payment is available
 */
export async function updateNoPaymentMessage(
  tenantId: string,
  message: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        'paymentConfig.noPaymentMessage': message,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Initialize payment config for a tenant (first-time setup)
 */
export async function initializePaymentConfig(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId, paymentConfig: { $exists: false } },
    {
      $set: {
        paymentConfig: {
          enabledMethods: [],
          noPaymentMessage: 'This seller has not set up payments yet. Please contact them directly to arrange payment.',
        },
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Remove Stripe Connect from a tenant
 */
export async function removeStripeConnect(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $unset: { 'paymentConfig.stripe': '' },
      $pull: { 'paymentConfig.enabledMethods': 'stripe' } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Remove PayPal Connect from a tenant
 */
export async function removePayPalConnect(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $unset: { 'paymentConfig.paypal': '' },
      $pull: { 'paymentConfig.enabledMethods': 'paypal' } as any,
      $set: { updatedAt: new Date() }
    }
  )
}

// =============================================================================
// USAGE TRACKING
// =============================================================================

type UsageField = 'storageUsedMB' | 'aiCaptionsUsedThisMonth' | 'ordersThisMonth'

/**
 * Increment a usage counter for a tenant
 */
export async function incrementUsage(
  tenantId: string,
  field: UsageField,
  amount = 1
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $inc: { [`usage.${field}`]: amount },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Decrement a usage counter for a tenant (e.g., when deleting media)
 */
export async function decrementUsage(
  tenantId: string,
  field: UsageField,
  amount = 1
): Promise<void> {
  const db = await getDatabase()
  // Use aggregation pipeline to ensure we don't go below 0
  await db.collection('tenants').updateOne(
    { id: tenantId },
    [
      {
        $set: {
          [`usage.${field}`]: {
            $max: [0, { $subtract: [{ $ifNull: [`$usage.${field}`, 0] }, amount] }]
          },
          updatedAt: new Date()
        }
      }
    ]
  )
}

/**
 * Reset monthly usage counters for a tenant
 */
export async function resetMonthlyUsage(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        'usage.aiCaptionsUsedThisMonth': 0,
        'usage.ordersThisMonth': 0,
        'usage.lastResetDate': new Date(),
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Get all tenants that need their monthly usage reset
 * Returns tenants whose lastResetDate is from a previous month
 */
export async function getTenantsNeedingUsageReset(): Promise<Tenant[]> {
  const db = await getDatabase()

  // Get the first day of current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const results = await db.collection('tenants').find({
    $or: [
      { 'usage.lastResetDate': { $lt: firstOfMonth } },
      { 'usage.lastResetDate': { $exists: false } },
      { usage: { $exists: false } }
    ]
  }).toArray()

  return results as unknown as Tenant[]
}

/**
 * Initialize usage tracking for a tenant (if not already set)
 */
export async function initializeUsage(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId, usage: { $exists: false } },
    {
      $set: {
        usage: {
          storageUsedMB: 0,
          aiCaptionsUsedThisMonth: 0,
          ordersThisMonth: 0,
          lastResetDate: new Date()
        },
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Get all tenants (for cron jobs)
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const db = await getDatabase()
  const results = await db.collection('tenants').find({}).toArray()
  return results as unknown as Tenant[]
}

/**
 * Alias for getAllTenants (for backward compatibility)
 */
export const listTenants = getAllTenants

// =============================================================================
// ONBOARDING
// =============================================================================

/**
 * Update onboarding step for a tenant
 */
export async function updateOnboardingStep(
  tenantId: string,
  step: OnboardingStep
): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        onboardingStep: step,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(tenantId: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        onboardingComplete: true,
        onboardingStep: 'complete',
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Check if tenant needs onboarding
 */
export async function needsOnboarding(tenantId: string): Promise<boolean> {
  const tenant = await getTenantById(tenantId)
  if (!tenant) return false
  return tenant.onboardingComplete !== true
}
