import { transactions } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

interface RevenueStats {
  today: number
  week: number
  month: number
  todayChange: number
  weekChange: number
  monthChange: number
}

export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Calculate date ranges
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    )

    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayStart)
    yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1)

    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(monthStart)
    lastMonthEnd.setMilliseconds(lastMonthEnd.getMilliseconds() - 1)

    // Fetch all revenue data in parallel
    const [
      todayTransactions,
      yesterdayTransactions,
      weekTransactions,
      lastWeekTransactions,
      monthTransactions,
      lastMonthTransactions,
    ] = await Promise.all([
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: todayStart,
          endDate: todayEnd,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: yesterdayStart,
          endDate: yesterdayEnd,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: weekStart,
          endDate: now,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: lastWeekStart,
          endDate: lastWeekEnd,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: monthStart,
          endDate: now,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.listTransactions(tenant.id, {
        filters: {
          startDate: lastMonthStart,
          endDate: lastMonthEnd,
          type: 'sale',
          status: 'completed',
        },
      }),
    ])

    // Calculate totals (in cents)
    const today = todayTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    )
    const yesterday = yesterdayTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    )
    const week = weekTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0)
    const lastWeek = lastWeekTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    )
    const month = monthTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    )
    const lastMonth = lastMonthTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    )

    // Calculate percentage changes
    const todayChange =
      yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0
    const weekChange =
      lastWeek > 0 ? Math.round(((week - lastWeek) / lastWeek) * 100) : 0
    const monthChange =
      lastMonth > 0 ? Math.round(((month - lastMonth) / lastMonth) * 100) : 0

    const stats: RevenueStats = {
      today,
      week,
      month,
      todayChange,
      weekChange,
      monthChange,
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error fetching revenue stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue stats' },
      { status: 500 },
    )
  }
}
