import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import type { TransactionType, TransactionFilters } from '@madebuy/shared'

const PAGE_SIZE = 50

/**
 * GET /api/transactions
 * List transactions with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10)
    const offset = (page - 1) * limit

    // Parse filters
    const filters: TransactionFilters = {}

    const startDate = searchParams.get('startDate')
    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.endDate = end
    }

    const type = searchParams.get('type')
    if (type) {
      filters.type = type as TransactionType
    }

    // Fetch balance and transactions in parallel
    const [balance, allTransactions, totalCount] = await Promise.all([
      transactions.getTenantBalance(tenant.id, filters),
      transactions.listTransactions(tenant.id, {
        filters,
        limit,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      transactions.countTransactions(tenant.id, filters),
    ])

    return NextResponse.json({
      balance,
      transactions: allTransactions,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
