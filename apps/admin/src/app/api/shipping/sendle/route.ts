import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { tenants } from '@madebuy/db'
import { Sendle } from '@madebuy/shared'
import type { SendleIntegration, TenantIntegrations } from '@madebuy/shared'

/**
 * GET /api/shipping/sendle
 * Get Sendle connection status
 */
export async function GET() {
  try {
    const tenant = await requireTenant()

    const sendleConfig = (tenant.integrations as { sendle?: SendleIntegration })?.sendle

    if (!sendleConfig) {
      return NextResponse.json({
        connected: false,
      })
    }

    return NextResponse.json({
      connected: true,
      sendleId: sendleConfig.sendleId,
      sandbox: sendleConfig.sandbox,
      connectedAt: sendleConfig.connectedAt,
    })
  } catch (error) {
    console.error('Get Sendle status error:', error)
    return NextResponse.json(
      { error: 'Failed to get Sendle status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shipping/sendle
 * Connect Sendle account
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    const { sendleId, apiKey, sandbox } = body

    if (!sendleId || !apiKey) {
      return NextResponse.json(
        { error: 'Sendle ID and API Key are required' },
        { status: 400 }
      )
    }

    // Verify credentials with Sendle
    const isValid = await Sendle.verifyCredentials({
      sendleId,
      apiKey,
      sandbox: sandbox ?? false,
    })

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Sendle credentials' },
        { status: 400 }
      )
    }

    // Save the integration
    const sendleIntegration: SendleIntegration = {
      sendleId,
      apiKey,
      sandbox: sandbox ?? false,
      connectedAt: new Date(),
    }

    const integrations: TenantIntegrations = {
      ...(tenant.integrations || {}),
      sendle: sendleIntegration,
    } as TenantIntegrations & { sendle: SendleIntegration }

    await tenants.updateTenant(tenant.id, { integrations })

    return NextResponse.json({
      success: true,
      message: 'Sendle account connected successfully',
    })
  } catch (error) {
    console.error('Connect Sendle error:', error)
    return NextResponse.json(
      {
        error: 'Failed to connect Sendle account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/shipping/sendle
 * Disconnect Sendle account
 */
export async function DELETE() {
  try {
    const tenant = await requireTenant()

    // Remove Sendle from integrations
    const integrations = { ...(tenant.integrations || {}) } as TenantIntegrations & {
      sendle?: SendleIntegration
    }
    delete integrations.sendle

    await tenants.updateTenant(tenant.id, { integrations })

    return NextResponse.json({
      success: true,
      message: 'Sendle account disconnected',
    })
  } catch (error) {
    console.error('Disconnect Sendle error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Sendle account' },
      { status: 500 }
    )
  }
}
