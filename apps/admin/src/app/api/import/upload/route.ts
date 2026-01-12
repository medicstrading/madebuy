import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { uploadToR2 } from '@madebuy/storage'
import { imports } from '@madebuy/db'
import { nanoid } from 'nanoid'
import { parseCSV, detectSource, suggestColumnMapping } from '@/lib/csv-parser'

/**
 * POST /api/import/upload
 * Upload CSV file and create import job
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    const isCSV = file.name.endsWith('.csv') || validTypes.includes(file.type)
    if (!isCSV) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max for CSV)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()
    const buffer = Buffer.from(content, 'utf-8')

    // Quick parse to detect source and get row count
    const { headers, rows } = parseCSV(content)
    if (headers.length === 0) {
      return NextResponse.json(
        { error: 'CSV file appears to be empty or invalid' },
        { status: 400 }
      )
    }

    const detectedSource = detectSource(headers)

    // Generate unique filename
    const fileId = nanoid()
    const fileName = `imports/${fileId}.csv`

    // Upload to R2
    await uploadToR2({
      tenantId: tenant.id,
      fileName,
      buffer,
      contentType: 'text/csv',
      metadata: {
        originalFileName: file.name,
        type: 'import',
      },
    })

    // Create import job
    const job = await imports.createImportJob({
      tenantId: tenant.id,
      filename: file.name,
      fileKey: fileName,
      fileSize: file.size,
      source: detectedSource,
    })

    // Update with row count
    await imports.updateImportJob(tenant.id, job.id, {
      rowCount: rows.length,
    })

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        job: {
          ...job,
          rowCount: rows.length,
        },
        detectedSource,
        detectedColumns: headers,
        suggestedMapping: suggestColumnMapping(headers, detectedSource),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading CSV:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload CSV',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
