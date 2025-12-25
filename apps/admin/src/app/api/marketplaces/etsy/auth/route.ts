import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { Etsy } from '@madebuy/marketplaces'
import { cookies } from 'next/headers'

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID
const ETSY_REDIRECT_URI = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/marketplaces/etsy/callback`
  : 'http://localhost:3301/api/marketplaces/etsy/callback'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    if (!ETSY_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Etsy integration not configured' },
        { status: 500 }
      )
    }

    // Generate PKCE parameters
    const { verifier, challenge } = Etsy.generatePKCE()
    const state = Etsy.generateState()

    // Store verifier and state in cookies for callback
    const cookieStore = await cookies()
    cookieStore.set('etsy_code_verifier', verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })
    cookieStore.set('etsy_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    })

    // Generate authorization URL
    const authUrl = Etsy.getAuthorizationUrl({
      clientId: ETSY_CLIENT_ID,
      redirectUri: ETSY_REDIRECT_URI,
      state,
      codeChallenge: challenge,
      scopes: ['listings_r', 'listings_w', 'shops_r', 'shops_w'],
    })

    // Redirect to Etsy
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Etsy auth error:', error)
    return NextResponse.redirect('/dashboard/connections/marketplaces?error=auth_failed')
  }
}
