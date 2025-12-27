import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { invoices } from '@madebuy/db'

/**
 * GET /api/invoices/:id
 * Get a specific invoice by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await invoices.getInvoice(tenant.id, params.id)

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found',
          details: `No invoice found with ID: ${params.id}`,
          code: 'INVOICE_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve invoice',
        details: errorMessage,
        code: 'INVOICE_FETCH_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/invoices/:id
 * Delete an invoice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check invoice exists
    const existing = await invoices.getInvoice(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found',
          details: `No invoice found with ID: ${params.id}`,
          code: 'INVOICE_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    await invoices.deleteInvoice(tenant.id, params.id)

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
      deletedId: params.id
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete invoice',
        details: errorMessage,
        code: 'INVOICE_DELETE_FAILED'
      },
      { status: 500 }
    )
  }
}
