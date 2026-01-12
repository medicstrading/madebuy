import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { imports } from '@madebuy/db'
import { getFromR2 } from '@madebuy/storage'
import {
  parseCSV,
  detectSource,
  suggestColumnMapping,
  validateAndParse,
  generatePreview,
} from '@/lib/csv-parser'
import type { ColumnMapping } from '@madebuy/shared'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

/**
 * POST /api/import/[jobId]/validate
 * Run validation on uploaded CSV with column mapping
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params
    const body = await request.json().catch(() => ({}))
    const customMapping = body.mapping as ColumnMapping | undefined
    const updateExisting = body.updateExisting as boolean | undefined
    const skipErrors = body.skipErrors as boolean | undefined

    const job = await imports.getImportJob(tenant.id, jobId)

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 })
    }

    // Can only validate uploaded jobs
    if (job.status !== 'uploaded' && job.status !== 'validated') {
      return NextResponse.json(
        { error: `Cannot validate job with status: ${job.status}` },
        { status: 400 }
      )
    }

    // Update status to validating
    await imports.updateImportJob(tenant.id, jobId, {
      status: 'validating',
    })

    // Fetch CSV from R2 (fileKey already contains the full path)
    const csvBuffer = await getFromR2(job.fileKey)
    if (!csvBuffer) {
      await imports.updateImportJob(tenant.id, jobId, {
        status: 'failed',
        errors: [{ row: 0, message: 'Could not retrieve CSV file from storage' }],
      })
      return NextResponse.json(
        { error: 'Could not retrieve CSV file' },
        { status: 500 }
      )
    }

    const content = csvBuffer.toString('utf-8')
    const { headers, rows } = parseCSV(content)

    // Use custom mapping or auto-detect
    const source = detectSource(headers)
    const mapping = customMapping || suggestColumnMapping(headers, source)

    // Validate and parse all rows
    const result = validateAndParse(headers, rows, mapping)
    const preview = generatePreview(result)

    // Update job with validation results
    const updateData: Parameters<typeof imports.updateImportJob>[2] = {
      status: result.errors.length > 0 && !skipErrors ? 'validated' : 'validated',
      validatedAt: new Date(),
      rowCount: rows.length,
      columnMapping: mapping,
      preview,
      errors: result.errors,
      warnings: result.warnings,
    }

    if (updateExisting !== undefined) {
      updateData.updateExisting = updateExisting
    }
    if (skipErrors !== undefined) {
      updateData.skipErrors = skipErrors
    }

    const updatedJob = await imports.updateImportJob(tenant.id, jobId, updateData)

    return NextResponse.json({
      success: true,
      job: updatedJob,
      preview,
      errors: result.errors,
      warnings: result.warnings,
      canProceed: result.errors.length === 0 || skipErrors,
    })
  } catch (error) {
    console.error('Error validating CSV:', error)

    const { jobId } = await params
    const tenant = await getCurrentTenant()
    if (tenant) {
      await imports.updateImportJob(tenant.id, jobId, {
        status: 'failed',
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Validation failed' }],
      })
    }

    return NextResponse.json(
      { error: 'Failed to validate CSV' },
      { status: 500 }
    )
  }
}
