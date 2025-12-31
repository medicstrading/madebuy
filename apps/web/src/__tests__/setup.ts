import { vi } from 'vitest'

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/madebuy-test')

// Mock @madebuy/db
vi.mock('@madebuy/db', () => ({
  pieces: {
    getPiece: vi.fn(),
    getVariant: vi.fn(),
    updateVariantStock: vi.fn(),
    getAvailableStock: vi.fn(),
    hasStock: vi.fn(),
  },
  media: {
    getMedia: vi.fn(),
  },
  tenants: {
    getTenantById: vi.fn(),
  },
  stockReservations: {
    reserveStock: vi.fn(), // Now accepts variantId as 6th param
    cancelReservation: vi.fn(),
    completeReservation: vi.fn(),
    getAvailableStock: vi.fn(), // Now accepts variantId as 3rd param
    getReservationsBySession: vi.fn(),
  },
}))
