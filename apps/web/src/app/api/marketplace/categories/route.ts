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
    // Cache for 1 hour (categories rarely change)
    return NextResponse.json({
      categories: MARKETPLACE_CATEGORIES
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
