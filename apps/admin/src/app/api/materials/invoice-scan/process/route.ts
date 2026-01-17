import { invoices } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { extractTextFromInvoice } from '@/lib/services/invoice-ocr'
import {
  extractInvoiceDate,
  extractSupplier,
  extractTotalAmount,
  parseInvoiceLines,
} from '@/lib/services/invoice-parser'
import { getCurrentTenant } from '@/lib/session'

/**
 * POST /api/materials/invoice-scan/process
 * Process invoice with OCR and parse line items
 */
export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 },
      )
    }

    // Get invoice record
    const invoice = await invoices.getInvoice(tenant.id, invoiceId)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Download invoice file from R2
    const response = await fetch(invoice.fileUrl)
    if (!response.ok) {
      throw new Error('Failed to download invoice from R2')
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text using OCR
    const ocrResult = await extractTextFromInvoice(buffer)

    // Parse line items
    const lineItems = parseInvoiceLines(ocrResult.lines)

    // Extract metadata
    const supplier = extractSupplier(ocrResult.lines)
    const totalAmount = extractTotalAmount(ocrResult.lines)
    const invoiceDate = extractInvoiceDate(ocrResult.lines)

    // Update invoice with results
    await invoices.updateInvoice(tenant.id, invoiceId, {
      status: 'processed',
      ocrConfidence: ocrResult.confidence,
      lineItems,
      supplier,
      totalAmount,
      invoiceDate,
    })

    // Fetch updated invoice
    const updated = await invoices.getInvoice(tenant.id, invoiceId)

    return NextResponse.json({
      success: true,
      invoiceId: updated?.id,
      invoice: updated,
      lineItemCount: lineItems.length,
      ocrConfidence: ocrResult.confidence,
      message: 'Invoice processed successfully',
    })
  } catch (error) {
    console.error('Error processing invoice:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    // Update invoice status to error
    const { invoiceId } = await request.json().catch(() => ({}))
    if (invoiceId && tenant) {
      try {
        await invoices.updateInvoice(tenant.id, invoiceId, {
          status: 'error',
          errorMessage,
        })
      } catch (updateError) {
        console.error('Error updating invoice status:', updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process invoice with OCR',
        details: errorMessage,
        code: 'OCR_PROCESSING_FAILED',
      },
      { status: 500 },
    )
  }
}
