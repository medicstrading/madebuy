import {
  analytics,
  getDatabase,
  pieces,
  transactions,
} from '@madebuy/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Import handler AFTER mocks
import { GET } from '../dashboard/stats/route'

describe('Dashboard API - GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns comprehensive dashboard stats', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Mock today's transactions
    vi.mocked(transactions.listTransactions).mockResolvedValueOnce([
      { grossAmount: 10000, netAmount: 9500 },
      { grossAmount: 5000, netAmount: 4750 },
    ] as any)

    // Mock this month summary
    vi.mocked(transactions.getTransactionSummary).mockResolvedValueOnce({
      sales: {
        gross: 100000,
        net: 95000,
        count: 50,
        fees: 3000,
      },
      refunds: {
        amount: 5000,
        count: 2,
      },
    } as any)

    // Mock last month summary
    vi.mocked(transactions.getTransactionSummary).mockResolvedValueOnce({
      sales: {
        gross: 80000,
        net: 76000,
        count: 40,
      },
      refunds: {
        amount: 2000,
        count: 1,
      },
    } as any)

    // Mock balance
    vi.mocked(transactions.getTenantBalance).mockResolvedValue({
      pendingBalance: 25000,
      availableBalance: 50000,
    } as any)

    // Mock YTD fees (via getDatabase)
    const mockCollection = {
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ totalFees: 12000 }]),
      }),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any)

    // Mock orders for profitability calculation
    const mockThisMonthOrders = [
      {
        id: 'order-1',
        items: [{ pieceId: 'piece-1', price: 5000, quantity: 2 }],
      },
    ]
    const mockLastMonthOrders = [
      {
        id: 'order-2',
        items: [{ pieceId: 'piece-1', price: 5000, quantity: 1 }],
      },
    ]

    mockCollection.find = vi.fn().mockReturnValue({
      toArray: vi
        .fn()
        .mockResolvedValueOnce(mockThisMonthOrders)
        .mockResolvedValueOnce(mockLastMonthOrders),
    })

    // Mock pieces with COGS
    const mockPiecesMap = new Map([
      ['piece-1', { id: 'piece-1', cogs: 2000 }],
    ])
    vi.mocked(pieces.getPiecesByIds).mockResolvedValue(mockPiecesMap as any)

    // Mock funnel data
    vi.mocked(analytics.getFunnelData).mockResolvedValue({
      viewProduct: 1000,
      addToCart: 500,
      startCheckout: 300,
      completePurchase: 200,
      overallConversionRate: 20,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify ledger summary structure
    expect(data.ledgerSummary).toBeDefined()
    expect(data.ledgerSummary.todaySales).toEqual({
      gross: 15000,
      net: 14250,
      count: 2,
    })
    expect(data.ledgerSummary.pendingPayout).toEqual({
      amount: 25000,
      inTransit: 0,
      nextDate: null,
    })
    expect(data.ledgerSummary.thisMonth).toEqual({
      gross: 100000,
      net: 95000,
      count: 50,
      fees: 3000,
      refunds: 5000,
    })
    expect(data.ledgerSummary.lastMonth).toEqual({
      gross: 80000,
      net: 76000,
      count: 40,
    })
    expect(data.ledgerSummary.monthChange).toBeDefined()
    expect(data.ledgerSummary.feesYTD).toBe(12000)
    expect(data.ledgerSummary.profitability).toBeDefined()

    // Verify profitability structure
    expect(data.ledgerSummary.profitability.revenue).toBeDefined()
    expect(data.ledgerSummary.profitability.materialCosts).toBeDefined()
    expect(data.ledgerSummary.profitability.actualProfit).toBeDefined()
    expect(data.ledgerSummary.profitability.profitMargin).toBeDefined()
    expect(data.ledgerSummary.profitability.revenueChange).toBeDefined()
    expect(data.ledgerSummary.profitability.profitChange).toBeDefined()
    expect(data.ledgerSummary.profitability.marginChange).toBeDefined()

    // Verify funnel data
    expect(data.funnel).toEqual({
      viewProduct: 1000,
      addToCart: 500,
      startCheckout: 300,
      completePurchase: 200,
      overallConversionRate: 20,
    })
  })

  it('calculates profitability correctly', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Mock minimal transaction data
    vi.mocked(transactions.listTransactions).mockResolvedValue([])
    vi.mocked(transactions.getTransactionSummary)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0, fees: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
    vi.mocked(transactions.getTenantBalance).mockResolvedValue({
      pendingBalance: 0,
      availableBalance: 0,
    } as any)

    // Mock database for YTD fees
    const mockCollection = {
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [{ pieceId: 'piece-1', price: 10000, quantity: 1 }],
          },
          {
            id: 'order-2',
            items: [{ pieceId: 'piece-2', price: 5000, quantity: 2 }],
          },
        ]),
      }),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any)

    // Pieces with COGS
    const mockPiecesMap = new Map([
      ['piece-1', { id: 'piece-1', cogs: 3000 }],
      ['piece-2', { id: 'piece-2', cogs: 2000 }],
    ])
    vi.mocked(pieces.getPiecesByIds).mockResolvedValue(mockPiecesMap as any)

    vi.mocked(analytics.getFunnelData).mockResolvedValue({
      viewProduct: 0,
      addToCart: 0,
      startCheckout: 0,
      completePurchase: 0,
      overallConversionRate: 0,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)

    const profitability = data.ledgerSummary.profitability

    // Revenue: 10000 + (5000 * 2) = 20000
    expect(profitability.revenue).toBe(20000)

    // Material costs: 3000 + (2000 * 2) = 7000
    expect(profitability.materialCosts).toBe(7000)

    // Actual profit: 20000 - 7000 = 13000
    expect(profitability.actualProfit).toBe(13000)

    // Profit margin: (13000 / 20000) * 100 = 65%
    expect(profitability.profitMargin).toBe(65)
  })

  it('handles zero profitability correctly', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Mock minimal data
    vi.mocked(transactions.listTransactions).mockResolvedValue([])
    vi.mocked(transactions.getTransactionSummary)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0, fees: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
    vi.mocked(transactions.getTenantBalance).mockResolvedValue({
      pendingBalance: 0,
      availableBalance: 0,
    } as any)

    // Mock database with no orders
    const mockCollection = {
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any)

    vi.mocked(pieces.getPiecesByIds).mockResolvedValue(new Map())
    vi.mocked(analytics.getFunnelData).mockResolvedValue({
      viewProduct: 0,
      addToCart: 0,
      startCheckout: 0,
      completePurchase: 0,
      overallConversionRate: 0,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)

    const profitability = data.ledgerSummary.profitability
    expect(profitability.revenue).toBe(0)
    expect(profitability.materialCosts).toBe(0)
    expect(profitability.actualProfit).toBe(0)
    expect(profitability.profitMargin).toBe(0)
  })

  it('includes cache headers', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    // Mock minimal data to avoid errors
    vi.mocked(transactions.listTransactions).mockResolvedValue([])
    vi.mocked(transactions.getTransactionSummary)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0, fees: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
      .mockResolvedValueOnce({
        sales: { gross: 0, net: 0, count: 0 },
        refunds: { amount: 0, count: 0 },
      } as any)
    vi.mocked(transactions.getTenantBalance).mockResolvedValue({
      pendingBalance: 0,
      availableBalance: 0,
    } as any)

    const mockCollection = {
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any)

    vi.mocked(pieces.getPiecesByIds).mockResolvedValue(new Map())
    vi.mocked(analytics.getFunnelData).mockResolvedValue({
      viewProduct: 0,
      addToCart: 0,
      startCheckout: 0,
      completePurchase: 0,
      overallConversionRate: 0,
    })

    const response = await GET()

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

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch dashboard stats')
  })
})
