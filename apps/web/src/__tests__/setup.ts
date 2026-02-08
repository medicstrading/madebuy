import { vi } from 'vitest'

// Clear all env vars and mock only what we need
vi.unstubAllEnvs()

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/madebuy-test')
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_mock')
vi.stubEnv('STRIPE_PRICE_MAKER_MONTHLY', 'price_maker_monthly')
vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'price_professional_monthly')
vi.stubEnv('STRIPE_PRICE_STUDIO_MONTHLY', 'price_studio_monthly')
vi.stubEnv('NODE_ENV', 'test')
// Explicitly unset TURNSTILE_SECRET_KEY
delete process.env.TURNSTILE_SECRET_KEY

// Mock pino logger
vi.mock('pino', () => ({
  default: vi.fn(() => ({
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
}))

// Mock rate limiting - always allow requests in tests
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  rateLimit: vi.fn(() => vi.fn().mockResolvedValue(null)),
  rateLimiters: {
    api: vi.fn().mockResolvedValue(null),
    search: vi.fn().mockResolvedValue(null),
    checkout: vi.fn().mockResolvedValue(null),
    shipping: vi.fn().mockResolvedValue(null),
    reviews: vi.fn().mockResolvedValue(null),
    auth: vi.fn().mockResolvedValue(null),
  },
}))

// Mock next/headers for cookies support
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock @madebuy/db with all repositories needed by web tests
vi.mock('@madebuy/db', () => ({
  pieces: {
    getPiece: vi.fn(),
    getVariant: vi.fn(),
    updateVariantStock: vi.fn(),
    getAvailableStock: vi.fn(),
    hasStock: vi.fn(),
    listPieces: vi.fn(),
    searchPieces: vi.fn(),
    getPieceById: vi.fn(),
    getPiecesByIds: vi.fn(),
    getLowStockPieces: vi.fn(),
    incrementStock: vi.fn(),
    incrementVariantStock: vi.fn(),
  },
  media: {
    getMedia: vi.fn(),
  },
  tenants: {
    getTenantById: vi.fn(),
    getTenantBySlug: vi.fn(),
    updateTenant: vi.fn(),
    getTenantByStripeCustomerId: vi.fn(),
  },
  stockReservations: {
    reserveStock: vi.fn(),
    cancelReservation: vi.fn(),
    completeReservation: vi.fn(),
    getAvailableStock: vi.fn(),
    getReservationsBySession: vi.fn(),
    commitReservation: vi.fn(),
  },
  orders: {
    createOrder: vi.fn(),
    getOrder: vi.fn(),
    getOrderByStripeSessionId: vi.fn(),
    getOrderByPaymentIntent: vi.fn(),
    updateRefundStatus: vi.fn(),
    findDeliveredOrderWithProduct: vi.fn(),
  },
  abandonedCarts: {
    upsertAbandonedCart: vi.fn(),
    getAbandonedCartBySession: vi.fn(),
    markCartRecovered: vi.fn(),
  },
  discounts: {
    validateDiscountCode: vi.fn(),
    createDiscountCode: vi.fn(),
  },
  collections: {
    listPublishedCollections: vi.fn(),
    getFeaturedCollections: vi.fn(),
  },
  bundles: {
    listActiveBundles: vi.fn(),
    getBundleWithPieces: vi.fn(),
  },
  reviews: {
    listApprovedReviews: vi.fn(),
    getProductReviewStats: vi.fn(),
    createReview: vi.fn(),
    hasCustomerReviewedPiece: vi.fn(),
    listRecentApprovedReviews: vi.fn(),
    getTenantReviewStats: vi.fn(),
    getReviewById: vi.fn(),
    markReviewHelpful: vi.fn(),
    reportReview: vi.fn(),
    hasReviewedOrder: vi.fn(),
  },
  enquiries: {
    createEnquiry: vi.fn(),
  },
  tracking: {
    logEvent: vi.fn(),
  },
  transactions: {
    createTransaction: vi.fn(),
    getTransactionByStripeSessionId: vi.fn(),
  },
  downloads: {
    createDownloadRecord: vi.fn(),
    getDownloadRecordByToken: vi.fn(),
  },
  getDatabase: vi.fn(),
}))
