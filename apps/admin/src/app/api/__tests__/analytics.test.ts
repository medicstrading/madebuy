import { analytics, tracking, transactions } from '@madebuy/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Import handlers AFTER mocks
import { GET as GET_FUNNEL } from '../analytics/funnel/route'
import { GET as GET_REVENUE } from '../analytics/revenue/route'
import { GET as GET_SOURCES } from '../analytics/sources/route'

describe('Analytics API - GET /api/analytics/funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new Request('http://localhost/api/analytics/funnel')

    const response = await GET_FUNNEL(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns funnel data with default date range (30 days)', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockFunnelData = {
      viewProduct: 100,
      addToCart: 50,
      startCheckout: 30,
      completePurchase: 20,
      overallConversionRate: 20,
    }

    const mockTopProducts = [
      { id: 'p1', name: 'Product 1', conversionRate: 25 },
    ]

    vi.mocked(analytics.getFunnelData).mockResolvedValue(mockFunnelData)
    vi.mocked(analytics.getTopProductsByConversion).mockResolvedValue(
      mockTopProducts,
    )

    const request = new Request('http://localhost/api/analytics/funnel')
    const response = await GET_FUNNEL(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.funnel).toEqual(mockFunnelData)
    expect(data.topProducts).toEqual(mockTopProducts)
    expect(data.dateRange).toBeDefined()
    expect(data.dateRange.start).toBeDefined()
    expect(data.dateRange.end).toBeDefined()

    // Should call with tenant and dates (30 days back)
    expect(analytics.getFunnelData).toHaveBeenCalledWith(
      mockTenant.id,
      expect.any(Date),
      expect.any(Date),
    )
    expect(analytics.getTopProductsByConversion).toHaveBeenCalledWith(
      mockTenant.id,
      expect.any(Date),
      expect.any(Date),
      5,
    )
  })

  it('accepts custom date range', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockFunnelData = {
      viewProduct: 50,
      addToCart: 25,
      startCheckout: 15,
      completePurchase: 10,
      overallConversionRate: 20,
    }

    vi.mocked(analytics.getFunnelData).mockResolvedValue(mockFunnelData)
    vi.mocked(analytics.getTopProductsByConversion).mockResolvedValue([])

    const request = new Request(
      'http://localhost/api/analytics/funnel?startDate=2025-01-01&endDate=2025-01-31',
    )
    const response = await GET_FUNNEL(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.funnel).toEqual(mockFunnelData)

    const startDateArg = vi.mocked(analytics.getFunnelData).mock.calls[0][1]
    const endDateArg = vi.mocked(analytics.getFunnelData).mock.calls[0][2]

    expect(startDateArg.toISOString()).toContain('2025-01-01')
    expect(endDateArg.toISOString()).toContain('2025-01-31')
  })

  it('filters by product ID when provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockFunnelData = {
      viewProduct: 20,
      addToCart: 10,
      startCheckout: 5,
      completePurchase: 3,
      overallConversionRate: 15,
    }

    vi.mocked(analytics.getFunnelDataByProduct).mockResolvedValue(
      mockFunnelData,
    )
    vi.mocked(analytics.getTopProductsByConversion).mockResolvedValue([])

    const request = new Request(
      'http://localhost/api/analytics/funnel?productId=product-123',
    )
    const response = await GET_FUNNEL(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.funnel).toEqual(mockFunnelData)
    expect(analytics.getFunnelDataByProduct).toHaveBeenCalledWith(
      mockTenant.id,
      'product-123',
      expect.any(Date),
      expect.any(Date),
    )
  })

  it('includes cache headers', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    vi.mocked(analytics.getFunnelData).mockResolvedValue({
      viewProduct: 0,
      addToCart: 0,
      startCheckout: 0,
      completePurchase: 0,
      overallConversionRate: 0,
    })
    vi.mocked(analytics.getTopProductsByConversion).mockResolvedValue([])

    const request = new Request('http://localhost/api/analytics/funnel')
    const response = await GET_FUNNEL(request)

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=120, stale-while-revalidate=300',
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(analytics.getFunnelData).mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/analytics/funnel')
    const response = await GET_FUNNEL(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch funnel data')
  })
})

describe('Analytics API - GET /api/analytics/revenue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)

    const response = await GET_REVENUE()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns revenue stats with change percentages', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Mock today's transactions
    vi.mocked(transactions.listTransactions)
      .mockResolvedValueOnce([
        { grossAmount: 10000, netAmount: 9500 },
        { grossAmount: 5000, netAmount: 4750 },
      ] as any)
      // Mock yesterday's transactions
      .mockResolvedValueOnce([{ grossAmount: 8000, netAmount: 7600 }] as any)
      // Mock this week
      .mockResolvedValueOnce([{ grossAmount: 50000, netAmount: 47500 }] as any)
      // Mock last week
      .mockResolvedValueOnce([{ grossAmount: 40000, netAmount: 38000 }] as any)
      // Mock this month
      .mockResolvedValueOnce([
        { grossAmount: 100000, netAmount: 95000 },
      ] as any)
      // Mock last month
      .mockResolvedValueOnce([{ grossAmount: 80000, netAmount: 76000 }] as any)

    const response = await GET_REVENUE()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.today).toBe(15000) // 10000 + 5000
    expect(data.week).toBe(50000)
    expect(data.month).toBe(100000)
    expect(data.todayChange).toBeDefined()
    expect(data.weekChange).toBeDefined()
    expect(data.monthChange).toBeDefined()
  })

  it('calculates percentage changes correctly', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Today = 12000, Yesterday = 10000 → 20% increase
    vi.mocked(transactions.listTransactions)
      .mockResolvedValueOnce([{ grossAmount: 12000 }] as any) // today
      .mockResolvedValueOnce([{ grossAmount: 10000 }] as any) // yesterday
      .mockResolvedValueOnce([{ grossAmount: 50000 }] as any) // this week
      .mockResolvedValueOnce([{ grossAmount: 50000 }] as any) // last week (same)
      .mockResolvedValueOnce([{ grossAmount: 100000 }] as any) // this month
      .mockResolvedValueOnce([{ grossAmount: 50000 }] as any) // last month (100% increase)

    const response = await GET_REVENUE()
    const data = await response.json()

    expect(data.todayChange).toBe(20) // (12000 - 10000) / 10000 * 100 = 20%
    expect(data.weekChange).toBe(0) // No change
    expect(data.monthChange).toBe(100) // 100% increase
  })

  it('handles zero previous values', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // All previous values are 0
    vi.mocked(transactions.listTransactions)
      .mockResolvedValueOnce([{ grossAmount: 10000 }] as any) // today
      .mockResolvedValueOnce([]) // yesterday (empty)
      .mockResolvedValueOnce([{ grossAmount: 20000 }] as any) // this week
      .mockResolvedValueOnce([]) // last week (empty)
      .mockResolvedValueOnce([{ grossAmount: 30000 }] as any) // this month
      .mockResolvedValueOnce([]) // last month (empty)

    const response = await GET_REVENUE()
    const data = await response.json()

    expect(data.todayChange).toBe(0)
    expect(data.weekChange).toBe(0)
    expect(data.monthChange).toBe(0)
  })

  it('includes cache headers', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(transactions.listTransactions).mockResolvedValue([])

    const response = await GET_REVENUE()

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=120',
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(transactions.listTransactions).mockRejectedValue(
      new Error('DB error'),
    )

    const response = await GET_REVENUE()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch revenue stats')
  })
})

describe('Analytics API - GET /api/analytics/sources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new Request('http://localhost/api/analytics/sources')

    const response = await GET_SOURCES(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns source analytics with default date range (30 days)', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockSummary = {
      bySource: [
        { source: 'google', visits: 100, conversions: 10 },
        { source: 'direct', visits: 50, conversions: 5 },
      ],
      byMedium: [
        { medium: 'organic', visits: 80, conversions: 8 },
        { medium: 'none', visits: 70, conversions: 7 },
      ],
      byCampaign: [
        { campaign: 'summer-sale', visits: 30, conversions: 5 },
      ],
    }

    vi.mocked(tracking.getAnalyticsSummary).mockResolvedValue(mockSummary)

    const request = new Request('http://localhost/api/analytics/sources')
    const response = await GET_SOURCES(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSummary)
    expect(tracking.getAnalyticsSummary).toHaveBeenCalledWith(
      mockTenant.id,
      expect.any(Date),
      expect.any(Date),
    )
  })

  it('accepts custom date range', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockSummary = {
      bySource: [],
      byMedium: [],
      byCampaign: [],
    }

    vi.mocked(tracking.getAnalyticsSummary).mockResolvedValue(mockSummary)

    const request = new Request(
      'http://localhost/api/analytics/sources?startDate=2025-02-01&endDate=2025-02-07',
    )
    const response = await GET_SOURCES(request)

    expect(response.status).toBe(200)

    const startDateArg = vi.mocked(tracking.getAnalyticsSummary).mock.calls[0][1]
    const endDateArg = vi.mocked(tracking.getAnalyticsSummary).mock.calls[0][2]

    expect(startDateArg.toISOString()).toContain('2025-02-01')
    expect(endDateArg.toISOString()).toContain('2025-02-07')
  })

  it('includes cache headers', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    vi.mocked(tracking.getAnalyticsSummary).mockResolvedValue({
      bySource: [],
      byMedium: [],
      byCampaign: [],
    })

    const request = new Request('http://localhost/api/analytics/sources')
    const response = await GET_SOURCES(request)

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=120, stale-while-revalidate=300',
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(tracking.getAnalyticsSummary).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new Request('http://localhost/api/analytics/sources')
    const response = await GET_SOURCES(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch source data')
  })
})
