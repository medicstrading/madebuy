import { imports } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/import
 * List import jobs for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await imports.listImportJobs(tenant.id, { limit, offset })

    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error listing import jobs:', error)
    return NextResponse.json(
      { error: 'Failed to list import jobs' },
      { status: 500 },
    )
  }
}
