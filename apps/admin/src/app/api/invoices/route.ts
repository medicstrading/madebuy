import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { invoices } from '@madebuy/db'
import type { InvoiceFilters } from '@madebuy/shared'

/**
 * GET /api/invoices
 * List all invoices for the tenant with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const filters: InvoiceFilters = {}

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as any
    }

    if (searchParams.get('supplier')) {
      filters.supplier = searchParams.get('supplier') as string
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom') as string)
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo') as string)
    }

    const invoicesList = await invoices.listInvoices(tenant.id, filters)

    // Get stats
    const stats = await invoices.getInvoiceStats(tenant.id)

    return NextResponse.json({
      success: true,
      invoices: invoicesList,
      stats,
      count: invoicesList.length
    })
  } catch (error) {
    console.error('Error listing invoices:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve invoices',
        details: errorMessage,
        code: 'INVOICES_FETCH_FAILED'
      },
      { status: 500 }
    )
  }
}
