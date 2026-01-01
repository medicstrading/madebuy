import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pieces } from '@madebuy/db'
import {
  validatePersonalizationValues,
  calculatePersonalizationTotal,
} from '@madebuy/shared'
import type { PersonalizationConfig } from '@madebuy/shared'

// Request body schema
const ValidateRequestSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  pieceId: z.string().min(1, 'Piece ID is required'),
  values: z.record(z.object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    fileUrl: z.string().optional(),
  })),
})

/**
 * POST /api/personalization/validate
 * Validate personalization values against a piece's configuration
 * Used before checkout to ensure all required fields are filled correctly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const parseResult = ValidateRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid request body',
          details: parseResult.error.errors.map((e: z.ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    const { tenantId, pieceId, values } = parseResult.data

    // Get the piece
    const piece = await pieces.getPiece(tenantId, pieceId)
    if (!piece) {
      return NextResponse.json(
        { valid: false, error: 'Piece not found' },
        { status: 404 }
      )
    }

    // Check if personalization is enabled
    const config: PersonalizationConfig | undefined = piece.personalization
    if (!config || !config.enabled) {
      // If personalization is not enabled, no validation needed
      return NextResponse.json({
        valid: true,
        totalPriceAdjustment: 0,
        errors: {},
      })
    }

    // Validate the values against the config
    const validation = validatePersonalizationValues(config, values)

    // Calculate total price adjustment
    const basePrice = piece.price || 0
    const totalPriceAdjustment = calculatePersonalizationTotal(config, values, basePrice)

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      totalPriceAdjustment,
      processingDays: config.processingDays || 0,
    })
  } catch (error) {
    console.error('Personalization validation error:', error)

    return NextResponse.json(
      { valid: false, error: 'Failed to validate personalization' },
      { status: 500 }
    )
  }
}
