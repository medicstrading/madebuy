import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import type { TransactionType, TransactionStatus } from '@madebuy/shared'

/**
 * GET /api/ledger
 * List transactions with filtering and pagination
 *
 * Query params:
 * - type: TransactionType (sale, refund, payout, fee, adjustment)
 * - status: TransactionStatus (pending, completed, failed)
 * - search: string (searches description and orderId)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number (default 25)
 * - offset: number (default 0)
 * - sortBy: 'createdAt' | 'gross' | 'net'
 * - sortOrder: 'asc' | 'desc'
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TransactionType | null
    const status = searchParams.get('status') as TransactionStatus | null
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'gross' | 'net' | null
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    const result = await transactions.listTransactions(tenant.id, {
      type: type || undefined,
      status: status || undefined,
      search: search || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
