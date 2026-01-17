import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/late/callback
 * Handle OAuth callback from Late.dev
 *
 * Late.dev handles token exchange on their side - we just receive confirmation
 * and redirect the user to the appropriate page.
 *
 * Query params from Late.dev:
 * - connected: Platform name (e.g., "instagram", "facebook")
 * - profileId: Late.dev profile ID for the connected account
 * - username: Social media username
 * - error: OAuth error code (on failure)
 * - error_description: Human-readable error message
 */
export async function GET(request: NextRequest) {
  const baseRedirectPath = '/dashboard/connections'

  try {
    const searchParams = request.nextUrl.searchParams

    // Late.dev success params
    const connected = searchParams.get('connected')
    const profileId = searchParams.get('profileId')
    const username = searchParams.get('username')

    // Error params
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Late OAuth error:', error, errorDescription)
      const errorMessage = errorDescription || error || 'Connection failed'
      return NextResponse.redirect(
        new URL(
          `${baseRedirectPath}?error=${encodeURIComponent(errorMessage)}`,
          request.url,
        ),
      )
    }

    // Handle Late.dev success callback
    if (connected) {
      console.log(`Late OAuth success: ${connected} connected`, {
        profileId,
        username,
      })

      return NextResponse.redirect(
        new URL(
          `${baseRedirectPath}?success=${encodeURIComponent(connected)}&username=${encodeURIComponent(username || '')}`,
          request.url,
        ),
      )
    }

    // No recognized params - unexpected callback state
    console.error(
      'Late callback received with unrecognized params:',
      Object.fromEntries(searchParams),
    )
    return NextResponse.redirect(
      new URL(
        `${baseRedirectPath}?error=${encodeURIComponent('Invalid callback state')}`,
        request.url,
      ),
    )
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    console.error('Error in Late callback:', error)
    return NextResponse.redirect(
      new URL(
        `${baseRedirectPath}?error=${encodeURIComponent(errorMessage)}`,
        request.url,
      ),
    )
  }
}
