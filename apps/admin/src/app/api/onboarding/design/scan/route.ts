import { NextResponse } from 'next/server'

// Scanner not yet deployed - stub route
export async function POST() {
  return NextResponse.json(
    { status: 'failed', error: 'Website scanner not yet configured' },
    { status: 503 }
  )
}
