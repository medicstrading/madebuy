import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/late/callback
 * Handle OAuth callback from Late.dev
 *
 * Late.dev handles token exchange on their side - we just receive confirmation
 * and redirect the user to the appropriate page.
 *
 * Query params:
 * - code: OAuth authorization code (on success)
 * - state: Contains platform info (e.g., "instagram", "tiktok")
 * - error: OAuth error code (on failure)
 * - error_description: Human-readable error message
 */
export async function GET(request: NextRequest) {
  const baseRedirectPath = '/dashboard/connections'

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Contains platform info
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Late OAuth error:', error, errorDescription)
      const errorMessage = errorDescription || error || 'Connection failed'
      return NextResponse.redirect(
        new URL(
          `${baseRedirectPath}?error=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      )
    }

    // Handle success - Late.dev has already exchanged the code for tokens
    if (code) {
      // The state parameter contains the platform that was connected
      const platform = state || 'unknown'
      console.log(`Late OAuth success for platform: ${platform}`)

      return NextResponse.redirect(
        new URL(
          `${baseRedirectPath}?success=${encodeURIComponent(platform)}`,
          request.url
        )
      )
    }

    // No code or error - unexpected callback state
    console.error('Late callback received with no code or error')
    return NextResponse.redirect(
      new URL(
        `${baseRedirectPath}?error=${encodeURIComponent('Invalid callback state')}`,
        request.url
      )
    )
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    console.error('Error in Late callback:', error)
    return NextResponse.redirect(
      new URL(
        `${baseRedirectPath}?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    )
  }
}
