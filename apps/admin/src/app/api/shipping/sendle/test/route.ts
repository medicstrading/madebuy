import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'
import { createSendleClient } from '@madebuy/shipping'
import type { SendleSettings } from '@madebuy/shared'

/**
 * POST /api/shipping/sendle/test
 * Test Sendle API connection with provided credentials
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey, senderId, environment } = body

    // Validate required fields
    if (!senderId) {
      return NextResponse.json(
        { error: 'Sender ID is required' },
        { status: 400 }
      )
    }

    // Get tenant to check for existing API key if masked key was sent
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Determine which API key to use
    let actualApiKey = apiKey
    if (apiKey.includes('***')) {
      // User sent masked key, use stored key
      actualApiKey = tenant.sendleSettings?.apiKey
      if (!actualApiKey) {
        return NextResponse.json(
          { error: 'No API key found. Please enter a new API key.' },
          { status: 400 }
        )
      }
    }

    if (!actualApiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      )
    }

    // Create Sendle client and test connection
    const client = createSendleClient({
      apiKey: actualApiKey,
      senderId,
      environment: environment || 'sandbox',
    })

    const isValid = await client.verifyCredentials()

    if (isValid) {
      // Update tenant settings to mark as connected
      const newSettings: SendleSettings = {
        apiKey: actualApiKey,
        senderId,
        isConnected: true,
        connectedAt: new Date(),
        environment: environment || 'sandbox',
      }

      await tenants.updateTenant(user.id, { sendleSettings: newSettings })

      return NextResponse.json({
        success: true,
        message: 'Connection verified successfully',
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials. Please check your Sender ID and API Key.',
      })
    }
  } catch (error) {
    console.error('Failed to test Sendle connection:', error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json({
          success: false,
          message: 'Authentication failed. Please check your credentials.',
        })
      }
      if (error.message.includes('fetch')) {
        return NextResponse.json({
          success: false,
          message: 'Could not connect to Sendle. Please check your internet connection.',
        })
      }
    }

    return NextResponse.json(
      { error: 'Failed to test connection', success: false },
      { status: 500 }
    )
  }
}
