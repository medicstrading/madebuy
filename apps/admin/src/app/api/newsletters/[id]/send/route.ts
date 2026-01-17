import { customers, newsletters, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { sendNewsletter } from '@/lib/email'
import { getCurrentTenant } from '@/lib/session'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the newsletter
    const newsletter = await newsletters.getNewsletterById(tenant.id, params.id)

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 },
      )
    }

    if (newsletter.status !== 'draft') {
      return NextResponse.json(
        { error: 'Newsletter has already been sent' },
        { status: 400 },
      )
    }

    // Get the newsletter template
    const template = await newsletters.getNewsletterTemplate(tenant.id)

    // Get subscribed customers
    const subscribedCustomers = await customers.getSubscribedCustomers(
      tenant.id,
    )

    if (subscribedCustomers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribed customers to send to' },
        { status: 400 },
      )
    }

    // Get full tenant data for email building
    const tenantData = await tenants.getTenantById(tenant.id)
    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })
    }

    // Send the newsletter
    const recipients = subscribedCustomers.map((c) => ({
      email: c.email,
      name: c.name,
    }))

    const result = await sendNewsletter(
      newsletter,
      template,
      tenantData,
      recipients,
    )

    if (!result.success && result.sentCount === 0) {
      return NextResponse.json(
        {
          error: 'Failed to send newsletter',
          details: result.errors,
        },
        { status: 500 },
      )
    }

    // Mark newsletter as sent
    const updatedNewsletter = await newsletters.markNewsletterSent(
      tenant.id,
      params.id,
      result.sentCount,
    )

    return NextResponse.json({
      newsletter: updatedNewsletter,
      sentCount: result.sentCount,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('Error sending newsletter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
