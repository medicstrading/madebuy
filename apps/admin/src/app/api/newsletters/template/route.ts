import { newsletters } from '@madebuy/db'
import type { UpdateNewsletterTemplateInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await newsletters.getNewsletterTemplate(tenant.id)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching newsletter template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdateNewsletterTemplateInput = await request.json()

    const template = await newsletters.updateNewsletterTemplate(tenant.id, data)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating newsletter template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset template to defaults
    const template = await newsletters.resetNewsletterTemplate(tenant.id)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error resetting newsletter template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
