import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { tenants } from '@madebuy/db'
import type { TenantNotificationPreferences } from '@madebuy/shared'

// Default notification preferences (all on by default except newsletter)
const defaultPreferences: TenantNotificationPreferences = {
  orderNotifications: true,
  lowStockNotifications: true,
  disputeNotifications: true,
  payoutNotifications: true,
  reviewNotifications: true,
  enquiryNotifications: true,
  newsletterUpdates: false,
}

export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return current preferences or defaults
    const preferences = tenant.notificationPreferences || defaultPreferences

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences data' },
        { status: 400 }
      )
    }

    // Validate and sanitize preferences
    const sanitizedPreferences: TenantNotificationPreferences = {
      orderNotifications: Boolean(preferences.orderNotifications),
      lowStockNotifications: Boolean(preferences.lowStockNotifications),
      disputeNotifications: Boolean(preferences.disputeNotifications),
      payoutNotifications: Boolean(preferences.payoutNotifications),
      reviewNotifications: Boolean(preferences.reviewNotifications),
      enquiryNotifications: Boolean(preferences.enquiryNotifications),
      newsletterUpdates: Boolean(preferences.newsletterUpdates),
    }

    // Update tenant with new preferences
    await tenants.updateTenant(tenant.id, {
      notificationPreferences: sanitizedPreferences,
    } as any)

    return NextResponse.json({
      success: true,
      preferences: sanitizedPreferences,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
