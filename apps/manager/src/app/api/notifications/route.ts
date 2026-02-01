import { platformAnalytics } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

interface Notification {
  id: string
  type: 'signup' | 'order' | 'alert' | 'churn' | 'milestone'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
}

// In-memory store for read status (in production, use database)
const readNotifications = new Set<string>()

export async function GET() {
  try {
    await requireAdmin()

    const [tenantCounts, healthScores] = await Promise.all([
      platformAnalytics.getTenantCounts(),
      platformAnalytics.getTenantHealthScores(10),
    ])

    const notifications: Notification[] = []
    const now = new Date()

    // Check for at-risk tenants
    const atRiskTenants = healthScores.filter((t) => t.riskLevel === 'at-risk')
    const churningTenants = healthScores.filter(
      (t) => t.riskLevel === 'churning',
    )

    if (churningTenants.length > 0) {
      notifications.push({
        id: `churn-alert-${now.toISOString().split('T')[0]}`,
        type: 'alert',
        title: 'Churn Risk Alert',
        message: `${churningTenants.length} tenant(s) showing signs of churning`,
        timestamp: now.toISOString(),
        read: readNotifications.has(
          `churn-alert-${now.toISOString().split('T')[0]}`,
        ),
        data: { count: churningTenants.length },
      })
    }

    if (atRiskTenants.length > 0) {
      notifications.push({
        id: `risk-alert-${now.toISOString().split('T')[0]}`,
        type: 'alert',
        title: 'At-Risk Tenants',
        message: `${atRiskTenants.length} tenant(s) need attention`,
        timestamp: now.toISOString(),
        read: readNotifications.has(
          `risk-alert-${now.toISOString().split('T')[0]}`,
        ),
        data: { count: atRiskTenants.length },
      })
    }

    // Check for milestone achievements
    if (tenantCounts.active >= 10 && tenantCounts.active % 10 === 0) {
      notifications.push({
        id: `milestone-tenants-${tenantCounts.active}`,
        type: 'milestone',
        title: 'Milestone Reached!',
        message: `You now have ${tenantCounts.active} active tenants`,
        timestamp: now.toISOString(),
        read: readNotifications.has(`milestone-tenants-${tenantCounts.active}`),
      })
    }

    // Add some static notifications for demo purposes
    const staticNotifications: Notification[] = [
      {
        id: 'welcome-1',
        type: 'signup',
        title: 'Platform Live',
        message: 'MadeBuy Manager is up and running',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        read: readNotifications.has('welcome-1'),
      },
    ]

    // Combine and sort by timestamp
    const allNotifications = [...notifications, ...staticNotifications]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10)

    const unreadCount = allNotifications.filter((n) => !n.read).length

    return NextResponse.json({
      notifications: allNotifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Notifications API error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()

    if (body.markAllRead) {
      // In production, update database
      // For now, we just acknowledge the request
      return NextResponse.json({ success: true })
    }

    if (body.markRead && body.id) {
      readNotifications.add(body.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Notifications PUT error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 },
    )
  }
}
