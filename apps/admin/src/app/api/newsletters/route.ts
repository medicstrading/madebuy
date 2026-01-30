import { newsletters } from '@madebuy/db'
import type {
  CreateNewsletterInput,
  NewsletterListOptions,
} from '@madebuy/shared'
import { sanitizeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: NewsletterListOptions = {}

    if (searchParams.get('status')) {
      options.status = searchParams.get('status') as 'draft' | 'sent'
    }

    if (searchParams.get('limit')) {
      options.limit = parseInt(searchParams.get('limit')!, 10)
    }

    if (searchParams.get('offset')) {
      options.offset = parseInt(searchParams.get('offset')!, 10)
    }

    if (searchParams.get('sortBy')) {
      options.sortBy = searchParams.get(
        'sortBy',
      ) as NewsletterListOptions['sortBy']
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await newsletters.listNewsletters(tenant.id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching newsletters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateNewsletterInput = await request.json()

    if (!data.subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 },
      )
    }

    // Sanitize text inputs
    const sanitizedData: CreateNewsletterInput = {
      subject: sanitizeInput(data.subject),
      content: data.content,
    }

    const newsletter = await newsletters.createNewsletter(
      tenant.id,
      sanitizedData,
    )

    return NextResponse.json({ newsletter }, { status: 201 })
  } catch (error) {
    console.error('Error creating newsletter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
