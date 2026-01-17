import { tenants } from '@madebuy/db'
import type { SendleSettings } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/shipping/sendle
 * Get current Sendle settings for the tenant
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Return settings, masking the API key for security
    const settings: SendleSettings = tenant.sendleSettings || {
      isConnected: false,
      environment: 'sandbox',
    }

    return NextResponse.json({
      apiKey: settings.apiKey ? maskApiKey(settings.apiKey) : '',
      senderId: settings.senderId || '',
      isConnected: settings.isConnected,
      connectedAt: settings.connectedAt,
      environment: settings.environment,
      pickupAddress: settings.pickupAddress || null,
      freeShippingThreshold: tenant.freeShippingThreshold || null,
    })
  } catch (error) {
    console.error('Failed to get Sendle settings:', error)
    return NextResponse.json(
      { error: 'Failed to get shipping settings' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/shipping/sendle
 * Save Sendle credentials
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      apiKey,
      senderId,
      environment,
      pickupAddress,
      freeShippingThreshold,
    } = body

    // Validate required fields (only if updating Sendle settings)
    // freeShippingThreshold can be updated independently
    if (
      apiKey !== undefined &&
      senderId !== undefined &&
      (!apiKey || !senderId)
    ) {
      return NextResponse.json(
        { error: 'API Key and Sender ID are required' },
        { status: 400 },
      )
    }

    // Validate environment
    if (environment !== 'sandbox' && environment !== 'production') {
      return NextResponse.json(
        { error: 'Invalid environment. Must be "sandbox" or "production"' },
        { status: 400 },
      )
    }

    // Get current tenant
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Build updates object
    const updates: Record<string, unknown> = {}

    // Handle Sendle settings if provided
    if (apiKey !== undefined && senderId !== undefined) {
      const currentSettings = tenant.sendleSettings
      const isNewApiKey = !apiKey.includes('***')

      const newSettings: SendleSettings = {
        apiKey: isNewApiKey ? apiKey : currentSettings?.apiKey,
        senderId,
        isConnected: false, // Reset connection status when credentials change
        environment,
        pickupAddress: pickupAddress || currentSettings?.pickupAddress,
      }
      updates.sendleSettings = newSettings
    }

    // Handle free shipping threshold (can be updated independently)
    if (freeShippingThreshold !== undefined) {
      // Convert to number (cents) or null to disable
      const threshold =
        freeShippingThreshold === null || freeShippingThreshold === ''
          ? undefined
          : Math.round(Number(freeShippingThreshold))

      if (
        threshold === undefined ||
        (typeof threshold === 'number' && threshold >= 0)
      ) {
        updates.freeShippingThreshold = threshold || undefined
      }
    }

    // Update tenant
    await tenants.updateTenant(user.id, updates)

    // Fetch updated tenant to return current state
    const updatedTenant = await tenants.getTenantById(user.id)
    const finalSettings = updatedTenant?.sendleSettings || tenant.sendleSettings

    return NextResponse.json({
      apiKey: maskApiKey(finalSettings?.apiKey || ''),
      senderId: finalSettings?.senderId || '',
      isConnected: finalSettings?.isConnected || false,
      connectedAt: finalSettings?.connectedAt,
      environment: finalSettings?.environment || 'sandbox',
      pickupAddress: finalSettings?.pickupAddress || null,
      freeShippingThreshold: updatedTenant?.freeShippingThreshold || null,
    })
  } catch (error) {
    console.error('Failed to save Sendle settings:', error)
    return NextResponse.json(
      { error: 'Failed to save shipping settings' },
      { status: 500 },
    )
  }
}

/**
 * Mask API key for display, showing only first and last few characters
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return apiKey
  const start = apiKey.slice(0, 4)
  const end = apiKey.slice(-4)
  return `${start}***${end}`
}
