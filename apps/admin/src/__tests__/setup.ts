/**
 * Test setup for @madebuy/admin app
 * Mocks Next.js environment, auth, and database dependencies
 */

import { beforeEach, vi } from 'vitest'

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/madebuy-test')
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3300')

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock @/lib/session
vi.mock('@/lib/session', () => ({
  getCurrentTenant: vi.fn(),
}))

// Mock @madebuy/db
vi.mock('@madebuy/db', () => ({
  tenants: {
    getTenantById: vi.fn(),
    getTenantByEmail: vi.fn(),
    getTenantBySlug: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
  },
  pieces: {
    getPiece: vi.fn(),
    listPieces: vi.fn(),
    createPiece: vi.fn(),
    updatePiece: vi.fn(),
    deletePiece: vi.fn(),
    getVariant: vi.fn(),
    updateVariantStock: vi.fn(),
    getAvailableStock: vi.fn(),
    hasStock: vi.fn(),
  },
  media: {
    getMedia: vi.fn(),
    createMedia: vi.fn(),
    deleteMedia: vi.fn(),
    listMedia: vi.fn(),
  },
  orders: {
    getOrder: vi.fn(),
    listOrders: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
  materials: {
    getMaterial: vi.fn(),
    listMaterials: vi.fn(),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  },
  auditLog: {
    logAuditEvent: vi.fn(),
  },
  stockReservations: {
    reserveStock: vi.fn(),
    cancelReservation: vi.fn(),
    completeReservation: vi.fn(),
    getAvailableStock: vi.fn(),
  },
}))

// Mock @madebuy/storage
vi.mock('@madebuy/storage', () => ({
  uploadToR2: vi.fn(),
  uploadToLocal: vi.fn(),
  processImageWithVariants: vi.fn(),
  deleteFromR2: vi.fn(),
}))

// Mock @madebuy/social
vi.mock('@madebuy/social', () => ({
  publishToSocial: vi.fn(),
  generateCaption: vi.fn(),
}))

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Export mock helpers
export function mockCurrentTenant(
  tenant: Partial<{ id: string; email: string }> | null,
) {
  const { getCurrentTenant } = require('@/lib/session')
  vi.mocked(getCurrentTenant).mockResolvedValue(tenant)
}

export function mockUnauthorized() {
  const { getCurrentTenant } = require('@/lib/session')
  vi.mocked(getCurrentTenant).mockResolvedValue(null)
}
