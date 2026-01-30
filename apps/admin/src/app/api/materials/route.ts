import { materials } from '@madebuy/db'
import type { CreateMaterialInput } from '@madebuy/shared'
import {
  sanitizeInput,
  createLogger,
  isMadeBuyError,
  toErrorResponse,
  UnauthorizedError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

const log = createLogger({ module: 'materials' })

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const result = await materials.listMaterials(tenant.id)

    return NextResponse.json({
      materials: result.materials,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error fetching materials')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const data: CreateMaterialInput = await request.json()

    // Sanitize text inputs
    const sanitizedData: CreateMaterialInput = {
      ...data,
      name: sanitizeInput(data.name),
      category: data.category,
      supplier: data.supplier ? sanitizeInput(data.supplier) : undefined,
      notes: data.notes ? sanitizeInput(data.notes) : undefined,
    }

    const material = await materials.createMaterial(tenant.id, sanitizedData)

    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error creating material')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
