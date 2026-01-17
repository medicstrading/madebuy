import { imports } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

/**
 * GET /api/import/[jobId]
 * Get import job status and details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    const job = await imports.getImportJob(tenant.id, jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error fetching import job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import job' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/import/[jobId]
 * Delete/cancel an import job
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    const job = await imports.getImportJob(tenant.id, jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 },
      )
    }

    // Can only delete jobs that are not processing
    if (job.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete job while processing' },
        { status: 400 },
      )
    }

    const deleted = await imports.deleteImportJob(tenant.id, jobId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete import job' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting import job:', error)
    return NextResponse.json(
      { error: 'Failed to delete import job' },
      { status: 500 },
    )
  }
}
