import { tenants } from '@madebuy/db'
import { canUseAiCaption, getPlanLimits } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getCurrentTenant } from '@/lib/session'

// Lazy initialization
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Generic error message - don't leak env var names
      throw new Error('AI service not configured')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// Rate limiting
const rateLimit = {
  requests: new Map<string, { count: number; resetAt: number }>(),
  maxRequests: 10,
  windowMs: 60000,
}

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const entry = rateLimit.requests.get(tenantId)

  if (!entry || now > entry.resetAt) {
    rateLimit.requests.set(tenantId, {
      count: 1,
      resetAt: now + rateLimit.windowMs,
    })
    return true
  }

  if (entry.count >= rateLimit.maxRequests) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check feature gate for AI captions
    if (!tenant.features.aiCaptions) {
      return NextResponse.json(
        { error: 'AI description generation requires a Pro or higher plan' },
        { status: 403 },
      )
    }

    // Check usage limit (descriptions share the same counter as captions)
    const usedThisMonth = tenant.usage?.aiCaptionsUsedThisMonth ?? 0
    if (!canUseAiCaption(tenant.plan, usedThisMonth)) {
      const limits = getPlanLimits(tenant.plan)
      return NextResponse.json(
        {
          error: `Monthly AI generation limit reached (${limits.aiCaptionsPerMonth}). Upgrade your plan for more.`,
        },
        { status: 403 },
      )
    }

    // Check rate limit
    if (!checkRateLimit(tenant.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 },
      )
    }

    const { name, category } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const openai = getOpenAI()

    // Build context about the business
    const businessContext = tenant.businessName
      ? `The seller's business is "${tenant.businessName}"`
      : 'This is a handmade/maker business'

    const categoryContext = category ? ` in the ${category} category` : ''

    const prompt = `You are helping a maker/artisan write a product description for their online store.

${businessContext}. They are listing a product called "${name}"${categoryContext}.

Write a compelling, authentic product description (2-3 sentences) that:
- Highlights the handmade/artisan nature
- Is warm and personal but professional
- Mentions craftsmanship or materials if relevant
- Avoids generic marketing speak
- Is suitable for an online marketplace

Just provide the description text, no quotes or labels.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    })

    const description = response.choices[0]?.message?.content?.trim() || ''

    // Increment usage counter (shares counter with AI captions)
    await tenants.incrementUsage(tenant.id, 'aiCaptionsUsedThisMonth')

    return NextResponse.json({ description })
  } catch (error) {
    console.error('Error generating description:', error)

    // Don't leak API configuration details to client
    const errorMessage = error instanceof Error && error.message.includes('not configured')
      ? 'AI service is not configured. Please contact support.'
      : 'Failed to generate description. Please try again.'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    )
  }
}
