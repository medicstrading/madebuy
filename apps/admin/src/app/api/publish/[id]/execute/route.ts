import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { executePublishRecord } from '@/lib/publish-execute'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await executePublishRecord(tenant.id, params.id)

    if (result.error && !result.success && result.results.length === 0) {
      // Determine appropriate status code
      const statusCode = result.error === 'Publish record not found' ? 404
        : result.error === 'Post already published' ? 400
        : 500

      return NextResponse.json(
        { error: result.error },
        { status: statusCode },
      )
    }

    return NextResponse.json({
      success: result.success,
      results: result.results,
    })
  } catch (error) {
    console.error('Error executing publish:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
