import type { Piece, Tenant } from '@madebuy/shared'
import type { EtsyListingCreateInput, EtsyListingUpdateInput } from './types'

/**
 * Etsy taxonomy mapping for jewelry categories
 * These are common Etsy category IDs for jewelry
 */
const JEWELRY_TAXONOMY_MAP: Record<string, number> = {
  'rings': 1122,
  'necklaces': 1110,
  'earrings': 1118,
  'bracelets': 1114,
  'anklets': 1116,
  'pendants': 1112,
  'charms': 1124,
  'jewelry sets': 1128,
  'brooches': 1120,
  'body jewelry': 1126,
  'other': 1106, // General jewelry category
}

/**
 * Determine Etsy "when_made" value from piece data
 */
export function determineWhenMade(piece: Piece): EtsyListingCreateInput['when_made'] {
  // For handmade jewelry, typically "made_to_order" or current era
  return 'made_to_order'
}

/**
 * Map category to Etsy taxonomy ID
 */
export function mapCategoryToTaxonomy(category?: string): number {
  if (!category) return JEWELRY_TAXONOMY_MAP['other']

  const normalized = category.toLowerCase().trim()
  return JEWELRY_TAXONOMY_MAP[normalized] || JEWELRY_TAXONOMY_MAP['other']
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Convert MadeBuy piece to Etsy listing create input
 */
export function pieceToEtsyListingCreate(
  piece: Piece,
  tenant: Tenant
): EtsyListingCreateInput {
  // Combine stones and metals into materials array
  const materials: string[] = []
  if (piece.stones?.length) materials.push(...piece.stones)
  if (piece.metals?.length) materials.push(...piece.metals)

  // Build description with all details
  let description = piece.description || ''

  // Add materials section if we have stones/metals
  if (materials.length > 0) {
    description += '\n\nMaterials:\n' + materials.map(m => `• ${m}`).join('\n')
  }

  // Add techniques if available
  if (piece.techniques?.length) {
    description += '\n\nTechniques:\n' + piece.techniques.map(t => `• ${t}`).join('\n')
  }

  // Add dimensions if available
  const dimensions: string[] = []
  if (piece.dimensions) dimensions.push(`Dimensions: ${piece.dimensions}`)
  if (piece.weight) dimensions.push(`Weight: ${piece.weight}`)
  if (piece.chainLength) dimensions.push(`Chain Length: ${piece.chainLength}`)

  if (dimensions.length > 0) {
    description += '\n\n' + dimensions.join('\n')
  }

  // Build tags from piece tags and category
  const tags: string[] = []
  if (piece.tags?.length) {
    tags.push(...piece.tags.slice(0, 10)) // Etsy allows max 13 tags, save some for other tags
  }
  if (piece.category) {
    tags.push(piece.category)
  }
  // Add "handmade" tag
  tags.push('handmade')

  // Limit to 13 tags (Etsy max)
  const finalTags = [...new Set(tags)].slice(0, 13)

  return {
    quantity: piece.stock || 1,
    title: truncate(piece.name, 140), // Etsy title max length
    description: description.trim(),
    price: piece.price || 0,
    who_made: 'i_did',
    when_made: determineWhenMade(piece),
    taxonomy_id: mapCategoryToTaxonomy(piece.category),
    shipping_profile_id: tenant.integrations?.etsy?.shippingProfileId
      ? parseInt(tenant.integrations.etsy.shippingProfileId)
      : undefined,
    materials: materials.slice(0, 13), // Etsy allows max 13 materials
    tags: finalTags,
    is_supply: false,
    is_customizable: false,
    should_auto_renew: true,
    is_taxable: true,
    type: 'physical',
    // Processing time (days)
    processing_min: 1,
    processing_max: 3,
  }
}

/**
 * Convert MadeBuy piece to Etsy listing update input
 */
export function pieceToEtsyListingUpdate(
  piece: Piece,
  tenant: Tenant
): EtsyListingUpdateInput {
  // Similar to create, but with optional fields
  const materials: string[] = []
  if (piece.stones?.length) materials.push(...piece.stones)
  if (piece.metals?.length) materials.push(...piece.metals)

  let description = piece.description || ''

  if (materials.length > 0) {
    description += '\n\nMaterials:\n' + materials.map(m => `• ${m}`).join('\n')
  }

  if (piece.techniques?.length) {
    description += '\n\nTechniques:\n' + piece.techniques.map(t => `• ${t}`).join('\n')
  }

  const dimensions: string[] = []
  if (piece.dimensions) dimensions.push(`Dimensions: ${piece.dimensions}`)
  if (piece.weight) dimensions.push(`Weight: ${piece.weight}`)
  if (piece.chainLength) dimensions.push(`Chain Length: ${piece.chainLength}`)

  if (dimensions.length > 0) {
    description += '\n\n' + dimensions.join('\n')
  }

  const tags: string[] = []
  if (piece.tags?.length) tags.push(...piece.tags.slice(0, 10))
  if (piece.category) tags.push(piece.category)
  tags.push('handmade')

  const finalTags = [...new Set(tags)].slice(0, 13)

  // Map piece status to Etsy state
  let etsyState: 'active' | 'inactive' | 'draft' | undefined
  if (piece.status === 'available') {
    etsyState = 'active'
  } else if (piece.status === 'draft') {
    etsyState = 'draft'
  } else if (piece.status === 'sold' || piece.status === 'reserved') {
    etsyState = 'inactive'
  }

  return {
    title: truncate(piece.name, 140),
    description: description.trim(),
    materials: materials.slice(0, 13),
    tags: finalTags,
    taxonomy_id: mapCategoryToTaxonomy(piece.category),
    state: etsyState,
    who_made: 'i_did',
    when_made: determineWhenMade(piece),
    is_supply: false,
    processing_min: 1,
    processing_max: 3,
  }
}

/**
 * Create inventory update payload for quantity change
 */
export function createInventoryUpdate(
  quantity: number,
  price: number
): { products: Array<{ offerings: Array<{ price: number; quantity: number; is_enabled: boolean }> }> } {
  return {
    products: [
      {
        offerings: [
          {
            price: price,
            quantity: quantity,
            is_enabled: quantity > 0, // Disable if out of stock
          },
        ],
      },
    ],
  }
}
