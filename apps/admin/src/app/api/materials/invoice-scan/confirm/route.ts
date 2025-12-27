import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { invoices, materials } from '@madebuy/db'
import type { InvoiceLineItem, CreateMaterialInput } from '@madebuy/shared'

/**
 * POST /api/materials/invoice-scan/confirm
 * Confirm and save invoice line items as materials
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId, confirmedLineItems } = await request.json() as {
      invoiceId: string
      confirmedLineItems: InvoiceLineItem[]
    }

    if (!invoiceId || !confirmedLineItems) {
      return NextResponse.json(
        { error: 'Invoice ID and confirmed line items required' },
        { status: 400 }
      )
    }

    // Get invoice record
    const invoice = await invoices.getInvoice(tenant.id, invoiceId)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const createdMaterialIds: string[] = []
    const updatedMaterialIds: string[] = []
    const errors: Array<{ item: InvoiceLineItem; error: string }> = []

    // Process each confirmed line item
    for (const item of confirmedLineItems) {
      try {
        if (item.action === 'skip') {
          continue
        }

        if (item.action === 'create') {
          // Create new material
          if (!item.parsedName || !item.parsedUnit || item.parsedPrice === undefined || item.parsedQuantity === undefined) {
            errors.push({
              item,
              error: 'Missing required fields for creating material'
            })
            continue
          }

          // Determine category from name (simple heuristic, can be improved)
          const category = determineCategoryFromName(item.parsedName)

          const newMaterialData: CreateMaterialInput = {
            name: item.parsedName,
            category,
            quantityInStock: item.parsedQuantity,
            unit: item.parsedUnit,
            costPerUnit: item.parsedPrice,
            currency: invoice.currency || 'AUD',
            reorderPoint: Math.floor(item.parsedQuantity * 0.2), // Default: 20% of initial stock
            supplier: invoice.supplier,
            tags: []
          }

          const newMaterial = await materials.createMaterial(
            tenant.id,
            newMaterialData
          )

          // Update material with invoice tracking
          await materials.restockMaterialFromInvoice(
            tenant.id,
            newMaterial.id,
            invoiceId,
            0, // No additional stock since we just created it
            item.parsedPrice
          )

          createdMaterialIds.push(newMaterial.id)
        } else if (item.action === 'update' && item.materialId) {
          // Update existing material stock
          if (item.parsedQuantity === undefined) {
            errors.push({
              item,
              error: 'Missing quantity for updating material'
            })
            continue
          }

          await materials.restockMaterialFromInvoice(
            tenant.id,
            item.materialId,
            invoiceId,
            item.parsedQuantity,
            item.parsedPrice
          )

          updatedMaterialIds.push(item.materialId)
        }
      } catch (error) {
        errors.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update invoice with material IDs
    const allMaterialIds = [...createdMaterialIds, ...updatedMaterialIds]
    await invoices.updateInvoice(tenant.id, invoiceId, {
      materialIds: allMaterialIds
    })

    return NextResponse.json({
      success: true,
      materialsCreated: createdMaterialIds.length,
      materialsUpdated: updatedMaterialIds.length,
      totalProcessed: createdMaterialIds.length + updatedMaterialIds.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${createdMaterialIds.length + updatedMaterialIds.length} materials${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    })
  } catch (error) {
    console.error('Error confirming invoice items:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save materials from invoice',
        details: errorMessage,
        code: 'CONFIRMATION_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * Helper: Determine material category from name (simple heuristic)
 * Can be improved with better categorization logic
 */
function determineCategoryFromName(name: string): CreateMaterialInput['category'] {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('wire')) return 'wire'
  if (lowerName.includes('chain')) return 'chain'
  if (lowerName.includes('finding') || lowerName.includes('clasp') || lowerName.includes('hook')) return 'finding'
  if (lowerName.includes('bead')) return 'bead'
  if (lowerName.includes('stone') || lowerName.includes('gem') || lowerName.includes('crystal')) return 'stone'
  if (lowerName.includes('silver') || lowerName.includes('gold') || lowerName.includes('metal')) return 'metal'
  if (lowerName.includes('tool') || lowerName.includes('plier')) return 'tool'
  if (lowerName.includes('box') || lowerName.includes('bag') || lowerName.includes('packaging')) return 'packaging'

  return 'other'
}
