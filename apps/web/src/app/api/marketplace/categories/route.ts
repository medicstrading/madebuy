import { NextResponse } from 'next/server'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'

/**
 * GET /api/marketplace/categories
 * Get marketplace category taxonomy
 */
export async function GET() {
  try {
    // Return predefined categories
    // In the future, this could be dynamic from database
    return NextResponse.json({
      categories: MARKETPLACE_CATEGORIES
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
