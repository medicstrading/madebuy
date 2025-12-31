import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { bulk } from '@madebuy/db'

/**
 * GET /api/pieces/export
 * Export pieces as CSV
 *
 * Query params:
 * - ids: comma-separated piece IDs (optional, exports all if not provided)
 * - format: 'csv' | 'json' (default: 'csv')
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const format = searchParams.get('format') || 'csv'

    const pieceIds = idsParam ? idsParam.split(',').filter(Boolean) : undefined

    const data = await bulk.exportPieces(tenant.id, pieceIds)

    if (format === 'json') {
      return NextResponse.json(data)
    }

    // Convert to CSV
    if (data.length === 0) {
      return new NextResponse('No data to export', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="pieces.csv"',
        },
      })
    }

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escape values with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pieces-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting pieces:', error)
    return NextResponse.json(
      { error: 'Failed to export pieces' },
      { status: 500 }
    )
  }
}
