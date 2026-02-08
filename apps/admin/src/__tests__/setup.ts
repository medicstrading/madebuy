/**
 * Test setup for @madebuy/admin app
 * Mocks Next.js environment, auth, and database dependencies
 */

import { beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_mock')
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_mock')
vi.stubEnv('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_connect_test_mock')
vi.stubEnv('STRIPE_PRICE_MAKER_MONTHLY', 'price_test_maker')
vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'price_test_professional')
vi.stubEnv('STRIPE_PRICE_STUDIO_MONTHLY', 'price_test_studio')
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/madebuy-test')
vi.stubEnv('MONGODB_DB', 'madebuy-test')
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3300')
vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'http://localhost:3301')
vi.stubEnv('CRON_SECRET', 'test-cron-secret')
vi.stubEnv('OPENAI_API_KEY', 'sk-test-openai')

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock next/cache - unstable_cache doesn't work in vitest environment
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn), // Just return the function unwrapped
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Mock @/lib/session - both getCurrentUser and getCurrentTenant
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentTenant: vi.fn(),
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
}))

// Mock @/lib/rate-limit - allow all requests by default
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
  rateLimiters: {
    auth: { check: vi.fn().mockResolvedValue(null) },
    api: { check: vi.fn().mockResolvedValue(null) },
    upload: { check: vi.fn().mockResolvedValue(null) },
    checkout: vi.fn().mockResolvedValue(null),
  },
  RateLimiter: vi.fn().mockImplementation(() => ({
    check: vi.fn().mockResolvedValue(null),
  })),
}))

// Mock @/lib/subscription-check
vi.mock('@/lib/subscription-check', () => ({
  checkCanAddPiece: vi.fn().mockResolvedValue({ allowed: true }),
  checkCanAddMedia: vi.fn().mockReturnValue({ allowed: true }),
  checkFeatureAccess: vi.fn().mockReturnValue({ allowed: true }),
  checkCustomDomainAccess: vi.fn().mockReturnValue({ allowed: true }),
  getSubscriptionSummary: vi.fn().mockResolvedValue({
    plan: 'free',
    pieces: { current: 5, limit: 10, canAdd: true },
  }),
}))

// Mock @/lib/website-design
vi.mock('@/lib/website-design', () => ({
  canCustomizeColors: vi.fn().mockReturnValue(true),
  canCustomizeBanner: vi.fn().mockReturnValue(true),
  canCustomizeTypography: vi.fn().mockReturnValue(true),
  canCustomizeLayout: vi.fn().mockReturnValue(true),
  canUseCustomSections: vi.fn().mockReturnValue(true),
  canUseBlog: vi.fn().mockReturnValue(true),
  validateWebsiteDesignUpdate: vi.fn().mockReturnValue({ valid: true }),
  getWebsiteDesignAccessLevel: vi.fn().mockReturnValue({
    canCustomizeColors: true,
    canCustomizeBanner: true,
    canCustomizeTypography: true,
    canCustomizeLayout: true,
    canUseCustomSections: true,
    canUseBlog: true,
    plan: 'professional',
    upgradeRequired: false,
  }),
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
}))

// Mock @madebuy/db - comprehensive repo mocks
vi.mock('@madebuy/db', () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      updateOne: vi.fn().mockResolvedValue({}),
      findOne: vi.fn().mockResolvedValue(null),
    }),
  }),
  tenants: {
    getTenantById: vi.fn(),
    getTenantByEmail: vi.fn(),
    getTenantBySlug: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
    listTenants: vi.fn(),
    incrementUsage: vi.fn(),
    initializePaymentConfig: vi.fn(),
    updateStripeConnectStatus: vi.fn(),
    removeStripeConnect: vi.fn(),
    getTenantsNeedingUsageReset: vi.fn(),
    resetMonthlyUsage: vi.fn(),
  },
  pieces: {
    getPiece: vi.fn(),
    getPieceBySlug: vi.fn(),
    getPiecesByIds: vi.fn(),
    listPieces: vi.fn(),
    createPiece: vi.fn(),
    updatePiece: vi.fn(),
    deletePiece: vi.fn(),
    getVariant: vi.fn(),
    updateVariantStock: vi.fn(),
    getAvailableStock: vi.fn(),
    hasStock: vi.fn(),
    countPieces: vi.fn(),
    getLowStockPieces: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
    exportPieces: vi.fn(),
    addMediaToPiece: vi.fn(),
  },
  media: {
    getMedia: vi.fn(),
    getMediaByIds: vi.fn().mockResolvedValue([]),
    createMedia: vi.fn(),
    deleteMedia: vi.fn(),
    deleteMediaBulk: vi.fn(),
    listMedia: vi.fn(),
    bulkDeleteMedia: vi.fn(),
    countMedia: vi.fn(),
  },
  orders: {
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    updateOrderPaymentStatus: vi.fn(),
    countOrders: vi.fn(),
    getOrderStats: vi.fn(),
    exportOrders: vi.fn(),
  },
  materials: {
    getMaterial: vi.fn(),
    listMaterials: vi.fn(),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    recordMaterialUsage: vi.fn(),
  },
  blog: {
    getBlogPost: vi.fn(),
    listBlogPosts: vi.fn(),
    createBlogPost: vi.fn(),
    updateBlogPost: vi.fn(),
    deleteBlogPost: vi.fn(),
  },
  bundles: {
    getBundle: vi.fn(),
    listBundles: vi.fn(),
    createBundle: vi.fn(),
    updateBundle: vi.fn(),
    deleteBundle: vi.fn(),
    getBundleWithPieces: vi.fn(),
  },
  collections: {
    getCollectionById: vi.fn(),
    listCollections: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    addPieceToCollection: vi.fn(),
    removePieceFromCollection: vi.fn(),
  },
  customers: {
    getCustomerById: vi.fn(),
    getCustomerByEmail: vi.fn(),
    getCustomerWithOrders: vi.fn(),
    listCustomers: vi.fn(),
    createOrUpdateCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getCustomerStats: vi.fn(),
    getTopCustomers: vi.fn(),
    getAcquisitionSources: vi.fn(),
    exportCustomers: vi.fn(),
  },
  discounts: {
    getDiscount: vi.fn(),
    listDiscounts: vi.fn(),
    createDiscount: vi.fn(),
    updateDiscount: vi.fn(),
    deleteDiscount: vi.fn(),
    getDiscountStats: vi.fn(),
    validateDiscount: vi.fn(),
    getDiscountCodeById: vi.fn(),
    listDiscountCodes: vi.fn(),
    createDiscountCode: vi.fn(),
    updateDiscountCode: vi.fn(),
    deleteDiscountCode: vi.fn(),
  },
  enquiries: {
    getEnquiry: vi.fn(),
    listEnquiries: vi.fn(),
    createEnquiry: vi.fn(),
    updateEnquiry: vi.fn(),
    updateEnquiryStatus: vi.fn(),
    addEnquiryNote: vi.fn(),
    deleteEnquiry: vi.fn(),
    replyToEnquiry: vi.fn(),
  },
  newsletters: {
    getNewsletter: vi.fn(),
    listNewsletters: vi.fn(),
    createNewsletter: vi.fn(),
    updateNewsletter: vi.fn(),
    deleteNewsletter: vi.fn(),
    sendNewsletter: vi.fn(),
    getNewsletterStats: vi.fn(),
  },
  reviews: {
    getReview: vi.fn(),
    listReviews: vi.fn(),
    createReview: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    moderateReview: vi.fn(),
  },
  analytics: {
    getRevenue: vi.fn(),
    getFunnelData: vi.fn(),
    getFunnelDataByProduct: vi.fn(),
    getTopProductsByConversion: vi.fn(),
    getTrafficSources: vi.fn(),
    trackEvent: vi.fn(),
  },
  tracking: {
    getAnalyticsSummary: vi.fn(),
    getTrackedLinks: vi.fn(),
  },
  domains: {
    getDomain: vi.fn(),
    createDomain: vi.fn(),
    deleteDomain: vi.fn(),
    verifyDomain: vi.fn(),
    getDomainStatus: vi.fn(),
    setCustomDomain: vi.fn(),
    removeCustomDomain: vi.fn(),
  },
  keyDates: {
    getKeyDate: vi.fn(),
    getKeyDateById: vi.fn(),
    listKeyDates: vi.fn(),
    createKeyDate: vi.fn(),
    updateKeyDate: vi.fn(),
    deleteKeyDate: vi.fn(),
  },
  marketplace: {
    getConnection: vi.fn(),
    listConnections: vi.fn(),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    getListing: vi.fn(),
    listListings: vi.fn(),
    createListing: vi.fn(),
    updateListing: vi.fn(),
    deleteListing: vi.fn(),
  },
  publish: {
    getPublishRecord: vi.fn(),
    listPublishRecords: vi.fn(),
    createPublishRecord: vi.fn(),
    updatePublishRecord: vi.fn(),
    deletePublishRecord: vi.fn(),
    executePublish: vi.fn(),
  },
  workshops: {
    getWorkshop: vi.fn(),
    getWorkshopById: vi.fn(),
    listWorkshops: vi.fn(),
    createWorkshop: vi.fn(),
    updateWorkshop: vi.fn(),
    deleteWorkshop: vi.fn(),
    getSlot: vi.fn(),
    listSlots: vi.fn(),
    createSlot: vi.fn(),
    updateSlot: vi.fn(),
    deleteSlot: vi.fn(),
    getBookings: vi.fn(),
    getAvailableSlots: vi.fn(),
  },
  imports: {
    getImportJob: vi.fn(),
    listImportJobs: vi.fn(),
    createImportJob: vi.fn(),
    updateImportJob: vi.fn(),
    deleteImportJob: vi.fn(),
    validateImport: vi.fn(),
    confirmImport: vi.fn(),
    incrementImportCounts: vi.fn(),
  },
  productionRuns: {
    getProductionRun: vi.fn(),
    listProductionRuns: vi.fn(),
    createProductionRun: vi.fn(),
    deleteProductionRun: vi.fn(),
  },
  reconciliations: {
    getReconciliation: vi.fn(),
    listReconciliations: vi.fn(),
    createReconciliation: vi.fn(),
    deleteReconciliation: vi.fn(),
    completeReconciliation: vi.fn(),
    cancelReconciliation: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
  },
  captionStyles: {
    getCaptionStyle: vi.fn(),
    listCaptionStyles: vi.fn(),
    createCaptionStyle: vi.fn(),
    updateCaptionStyle: vi.fn(),
    deleteCaptionStyle: vi.fn(),
    getExamples: vi.fn(),
    addExample: vi.fn(),
    deleteExample: vi.fn(),
    completeStyle: vi.fn(),
    getCaptionStyleProfile: vi.fn(),
  },
  invoices: {
    getInvoice: vi.fn(),
    listInvoices: vi.fn(),
    deleteInvoice: vi.fn(),
  },
  messages: {
    listMessages: vi.fn(),
    createMessage: vi.fn(),
  },
  transactions: {
    listTransactions: vi.fn(),
    getTransactionSummary: vi.fn(),
    getTenantBalance: vi.fn(),
    exportTransactions: vi.fn(),
  },
  disputes: {
    listDisputes: vi.fn(),
  },
  passwordResets: {
    createPasswordResetToken: vi.fn(),
    createResetToken: vi.fn(),
    getResetToken: vi.fn(),
    validateAndConsumeToken: vi.fn(),
    deleteResetToken: vi.fn(),
    consumeResetToken: vi.fn(),
  },
  auditLog: {
    logAuditEvent: vi.fn(),
  },
  stockReservations: {
    reserveStock: vi.fn(),
    cancelReservation: vi.fn(),
    completeReservation: vi.fn(),
    getAvailableStock: vi.fn(),
    getReservationsBySession: vi.fn(),
    cleanupExpired: vi.fn(),
  },
  abandonedCarts: {
    getAbandonedCarts: vi.fn(),
    createAbandonedCart: vi.fn(),
    markRecovered: vi.fn(),
  },
  previews: {
    getPreview: vi.fn(),
    createPreview: vi.fn(),
    deletePreview: vi.fn(),
  },
  variants: {
    getVariant: vi.fn(),
    listVariants: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    deleteVariant: vi.fn(),
  },
  wishlist: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
  downloads: {
    getDownload: vi.fn(),
    createDownloadToken: vi.fn(),
    verifyToken: vi.fn(),
  },
  bulk: {
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
    bulkUpdatePrices: vi.fn(),
    bulkUpdateStock: vi.fn(),
    bulkUpdateCategory: vi.fn(),
    bulkAddTags: vi.fn(),
    bulkRemoveTags: vi.fn(),
    bulkSetFeatured: vi.fn(),
    bulkSetPublished: vi.fn(),
    exportPieces: vi.fn(),
    getBulkStats: vi.fn(),
  },
  celebrations: {
    getCelebration: vi.fn(),
    listCelebrations: vi.fn(),
    createCelebration: vi.fn(),
  },
  systemHealth: {
    getHealth: vi.fn(),
  },
}))

// Mock @madebuy/storage
vi.mock('@madebuy/storage', () => ({
  uploadToR2: vi.fn(),
  uploadToLocal: vi.fn(),
  processImageWithVariants: vi.fn(),
  deleteFromR2: vi.fn(),
  getSignedUrl: vi.fn().mockResolvedValue('https://storage.example.com/signed-url'),
}))

// Mock @madebuy/social
vi.mock('@madebuy/social', () => ({
  publishToSocial: vi.fn(),
  generateCaption: vi.fn(),
  connectPlatform: vi.fn(),
  disconnectPlatform: vi.fn(),
}))

// Mock @madebuy/shared logger
vi.mock('@madebuy/shared', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      })),
    })),
  }
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// TEST HELPERS
// =============================================================================

// Import session functions AFTER mocks are set up
import { getCurrentTenant, getCurrentUser, requireAuth, requireTenant } from '@/lib/session'

/** Standard mock tenant for tests - free plan */
export const MOCK_TENANT_FREE = {
  id: 'tenant-123',
  email: 'test@example.com',
  businessName: 'Test Shop',
  slug: 'test-shop',
  plan: 'free' as const,
  features: {},
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

/** Mock tenant on maker plan */
export const MOCK_TENANT_MAKER = {
  ...MOCK_TENANT_FREE,
  plan: 'maker' as const,
}

/** Mock tenant on professional plan */
export const MOCK_TENANT_PRO = {
  ...MOCK_TENANT_FREE,
  plan: 'professional' as const,
}

/** Mock tenant on studio plan */
export const MOCK_TENANT_STUDIO = {
  ...MOCK_TENANT_FREE,
  plan: 'studio' as const,
}

/** Mock user session (returned by getCurrentUser) */
export const MOCK_USER = {
  id: 'tenant-123',
  email: 'test@example.com',
}

/** Set getCurrentTenant to return a tenant */
export function mockCurrentTenant(tenant: Record<string, unknown> | null) {
  vi.mocked(getCurrentTenant).mockResolvedValue(tenant)
  // Also set requireTenant to return the same tenant or throw if null
  if (tenant) {
    vi.mocked(requireTenant).mockResolvedValue(tenant)
  } else {
    vi.mocked(requireTenant).mockRejectedValue(new Error('Unauthorized'))
  }
}

/** Set getCurrentUser to return a user */
export function mockCurrentUser(user: Record<string, unknown> | null) {
  vi.mocked(getCurrentUser).mockResolvedValue(user)
  // Also set requireAuth to return the same user or throw if null
  if (user) {
    vi.mocked(requireAuth).mockResolvedValue(user)
  } else {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))
  }
}

/** Set both session mocks to unauthorized */
export function mockUnauthorized() {
  vi.mocked(getCurrentTenant).mockResolvedValue(null)
  vi.mocked(getCurrentUser).mockResolvedValue(null)
  vi.mocked(requireTenant).mockRejectedValue(new Error('Unauthorized'))
  vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))
}

/** Create a NextRequest for testing */
export function createRequest(
  url: string,
  options?: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  },
) {
  return new NextRequest(`http://localhost${url}`, {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
}
