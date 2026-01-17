import { NextResponse } from 'next/server'

// Cloudflare integration not yet deployed - stub route
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Cloudflare integration not yet configured' },
    { status: 503 },
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Cloudflare integration not yet configured' },
    { status: 503 },
  )
}

export async function GET() {
  return NextResponse.json({
    success: true,
    connected: false,
  })
}
