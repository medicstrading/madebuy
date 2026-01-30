import { media } from '@madebuy/db'
import {
  createLogger,
  isMadeBuyError,
  toErrorResponse,
  UnauthorizedError,
} from '@madebuy/shared'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

const log = createLogger({ module: 'media' })

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const allMedia = await media.listMedia(tenant.id)

    return NextResponse.json({ media: allMedia })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error fetching media')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
