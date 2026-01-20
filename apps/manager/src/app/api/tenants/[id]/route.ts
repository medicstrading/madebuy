import { auditLog, orders, pieces, tenants, transactions } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Props) {
  try {
    await requireAdmin()
    const { id } = await params

    // Fetch tenant
    const tenant = await tenants.getTenantById(id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Fetch stats in parallel using existing functions
    const longAgo = new Date('2020-01-01')
    const now = new Date()

    const [transactionSummary, activityData] = await Promise.all([
      transactions.getTransactionSummary(id, longAgo, now),
      auditLog.getAuditLogs(id, { limit: 10 }),
    ])

    // Get counts - we need to count properly
    const [piecesList, ordersList] = await Promise.all([
      pieces.listPieces(id, { limit: 1000 }),
      orders.listOrders(id, { limit: 1000 }),
    ])

    const productCount = piecesList.length
    const orderCount = ordersList.length
    const totalRevenue = (transactionSummary.sales?.gross || 0) / 100

    // Calculate health score
    let healthScore = 100
    const lastActive = tenant.updatedAt || tenant.createdAt
    const daysSinceActivity = lastActive
      ? Math.floor(
          (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24),
        )
      : 999

    if (daysSinceActivity > 30) healthScore -= 30
    else if (daysSinceActivity > 14) healthScore -= 15
    else if (daysSinceActivity > 7) healthScore -= 5

    if (productCount === 0) healthScore -= 30
    else if (productCount < 5) healthScore -= 10

    if (orderCount === 0) healthScore -= 20

    healthScore = Math.max(0, healthScore)

    return NextResponse.json({
      id: tenant.id,
      businessName: tenant.businessName,
      email: tenant.email,
      slug: tenant.slug,
      plan: tenant.plan || 'free',
      createdAt: tenant.createdAt,
      lastActive: lastActive,
      subscription: {
        status: tenant.subscriptionStatus,
        subscriptionId: tenant.subscriptionId,
        stripeCustomerId: tenant.stripeCustomerId,
      },
      features: tenant.features || {},
      storefront: {
        enabled: !!tenant.customDomain || true, // Storefronts are always enabled
        customDomain: tenant.customDomain,
      },
      stats: {
        productCount,
        orderCount,
        totalRevenue,
        healthScore,
      },
      recentActivity: activityData.map((a) => ({
        type: a.eventType,
        message:
          (a.metadata as { description?: string })?.description ||
          a.eventType.replace(/\./g, ' '),
        timestamp: a.createdAt,
      })),
    })
  } catch (error) {
    console.error('Tenant detail API error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch tenant details' },
      { status: 500 },
    )
  }
}
