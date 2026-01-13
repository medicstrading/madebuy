import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { getDatabase } from '@madebuy/db'
import type { WizardState, WizardDraft } from '@/components/wizard/types'

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status })
}

// Get current draft for tenant
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const db = await getDatabase()
    const draft = await db.collection<WizardDraft>('wizard_drafts').findOne({
      tenantId: tenant.id,
    })

    if (!draft) {
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        tenantId: draft.tenantId,
        state: draft.state,
        lastUpdated: draft.lastUpdated,
        createdAt: draft.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching wizard draft:', error)
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// Save or update draft
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const { state } = (await request.json()) as { state: WizardState }

    if (!state) {
      return errorResponse('Missing state', 'INVALID_INPUT', 400)
    }

    const db = await getDatabase()
    const now = new Date()

    // Upsert draft
    await db.collection<WizardDraft>('wizard_drafts').updateOne(
      { tenantId: tenant.id },
      {
        $set: {
          state,
          lastUpdated: now,
        },
        $setOnInsert: {
          id: `draft_${tenant.id}_${Date.now()}`,
          tenantId: tenant.id,
          createdAt: now,
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving wizard draft:', error)
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}

// Delete draft
export async function DELETE() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const db = await getDatabase()
    await db.collection<WizardDraft>('wizard_drafts').deleteOne({
      tenantId: tenant.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wizard draft:', error)
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500)
  }
}
