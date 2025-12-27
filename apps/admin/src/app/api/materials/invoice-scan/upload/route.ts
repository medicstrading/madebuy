import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { uploadToR2 } from '@madebuy/storage'
import { invoices } from '@madebuy/db'
import { nanoid } from 'nanoid'

/**
 * POST /api/materials/invoice-scan/upload
 * Upload invoice file to R2 storage and create invoice record
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
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPG, PNG, or PDF' },
        { status: 400 }
      )
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const fileId = nanoid()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${fileId}.${extension}`

    // Upload to R2
    const result = await uploadToR2({
      tenantId: tenant.id,
      fileName: `invoices/${fileName}`,
      buffer,
      contentType: file.type,
      metadata: {
        originalFileName: file.name,
        type: 'invoice'
      }
    })
    const fileUrl = result.url

    // Create invoice record
    const invoice = await invoices.createInvoice(tenant.id, {
      fileName: file.name,
      fileUrl,
      currency: 'AUD', // Default, can be updated after OCR
    })

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoice,
      message: 'Invoice uploaded successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload invoice',
        details: errorMessage,
        code: 'UPLOAD_FAILED'
      },
      { status: 500 }
    )
  }
}
