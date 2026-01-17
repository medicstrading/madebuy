import { type NextRequest, NextResponse } from 'next/server'
import { generateTemplate } from '@/lib/csv-parser'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/import/template
 * Download a blank CSV template
 */
export async function GET(_request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = generateTemplate()

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition':
          'attachment; filename="madebuy-import-template.csv"',
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 },
    )
  }
}
