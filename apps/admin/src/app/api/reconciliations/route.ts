import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { reconciliations } from '@madebuy/db'
import type { CreateReconciliationInput } from '@madebuy/shared'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'in_progress' | 'completed' | 'cancelled' | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await reconciliations.listReconciliations(tenant.id, {
      status: status || undefined,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching reconciliations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateReconciliationInput = await request.json()

    const reconciliation = await reconciliations.createReconciliation(tenant.id, data)

    return NextResponse.json({ reconciliation }, { status: 201 })
  } catch (error) {
    console.error('Error creating reconciliation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
