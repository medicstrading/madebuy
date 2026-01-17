import { NextResponse } from 'next/server'

// Cloudflare integration not yet deployed - stub route
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Cloudflare integration not yet configured' },
    { status: 503 },
  )
}
