import { NextRequest, NextResponse } from 'next/server'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Verify Cloudflare Turnstile challenge token
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      )
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY

    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Verify with Cloudflare
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      }),
    })

    const data = (await response.json()) as TurnstileVerifyResponse

    if (!data.success) {
      console.error('Turnstile verification failed:', data['error-codes'])
      return NextResponse.json(
        { success: false, error: 'Verification failed' },
        { status: 403 }
      )
    }

    // Success - set a session cookie or return success
    return NextResponse.json({
      success: true,
      message: 'Human verified',
    })
  } catch (error) {
    console.error('Error verifying Turnstile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
