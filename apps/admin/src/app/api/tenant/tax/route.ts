import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { tenants } from '@madebuy/db'
import type { TenantTaxSettings } from '@madebuy/shared'

/**
 * GET /api/tenant/tax
 * Get current tax settings for tenant
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fullTenant = await tenants.getTenantById(tenant.id)
    if (!fullTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({
      taxSettings: fullTenant.taxSettings || {
        gstRegistered: false,
        abn: '',
        gstRate: 10,
        pricesIncludeGst: true,
      },
    })
  } catch (error) {
    console.error('Error fetching tax settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tax settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tenant/tax
 * Update tax settings for tenant
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taxSettings } = body as { taxSettings: TenantTaxSettings }

    // Validate tax settings
    if (!taxSettings) {
      return NextResponse.json(
        { error: 'Tax settings required' },
        { status: 400 }
      )
    }

    // Validate ABN if provided and GST registered
    if (taxSettings.gstRegistered && taxSettings.abn) {
      const cleanAbn = taxSettings.abn.replace(/\s/g, '')
      if (cleanAbn.length !== 11 || !/^\d+$/.test(cleanAbn)) {
        return NextResponse.json(
          { error: 'Invalid ABN format. Must be exactly 11 digits.' },
          { status: 400 }
        )
      }
      // Store cleaned ABN
      taxSettings.abn = cleanAbn
    }

    // Validate GST rate
    if (
      typeof taxSettings.gstRate !== 'number' ||
      taxSettings.gstRate < 0 ||
      taxSettings.gstRate > 100
    ) {
      return NextResponse.json(
        { error: 'GST rate must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Update tenant with new tax settings
    await tenants.updateTenant(tenant.id, {
      taxSettings: {
        gstRegistered: Boolean(taxSettings.gstRegistered),
        abn: taxSettings.abn || undefined,
        gstRate: taxSettings.gstRate,
        pricesIncludeGst: Boolean(taxSettings.pricesIncludeGst),
      },
    })

    return NextResponse.json({ success: true, taxSettings })
  } catch (error) {
    console.error('Error updating tax settings:', error)
    return NextResponse.json(
      { error: 'Failed to update tax settings' },
      { status: 500 }
    )
  }
}
