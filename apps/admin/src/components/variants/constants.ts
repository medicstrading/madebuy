/**
 * Variant Editor Constants
 * Presets and default configurations for variant attributes
 */

import type { AttributePreset } from './types'

/**
 * Default maximum values
 */
export const MAX_ATTRIBUTES = 3
export const MAX_COMBINATIONS_WARNING = 100
export const MAX_COMBINATIONS_HARD_LIMIT = 500
export const LOW_STOCK_DEFAULT_THRESHOLD = 5
export const VARIANTS_PER_PAGE = 50

/**
 * Common attribute presets for Australian makers
 */
export const ATTRIBUTE_PRESETS: AttributePreset[] = [
  {
    id: 'sizes-clothing',
    name: 'Sizes (XS-3XL)',
    description: 'Standard clothing sizes',
    attributes: [
      {
        name: 'Size',
        values: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      },
    ],
  },
  {
    id: 'sizes-au',
    name: 'AU Clothing Sizes',
    description: 'Australian numeric clothing sizes',
    attributes: [
      {
        name: 'Size',
        values: ['6', '8', '10', '12', '14', '16', '18', '20', '22', '24'],
      },
    ],
  },
  {
    id: 'ring-sizes-au',
    name: 'Ring Sizes (AU)',
    description: 'Australian/UK ring sizes',
    attributes: [
      {
        name: 'Ring Size',
        values: ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'],
      },
    ],
  },
  {
    id: 'ring-sizes-us',
    name: 'Ring Sizes (US)',
    description: 'US ring sizes',
    attributes: [
      {
        name: 'Ring Size',
        values: ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
      },
    ],
  },
  {
    id: 'colors-basic',
    name: 'Colors (Basic)',
    description: 'Common basic colors',
    attributes: [
      {
        name: 'Color',
        values: ['Black', 'White', 'Grey', 'Navy', 'Red', 'Blue', 'Green'],
      },
    ],
  },
  {
    id: 'colors-metallic',
    name: 'Colors (Metallic)',
    description: 'Metallic jewelry colors',
    attributes: [
      {
        name: 'Color',
        values: ['Gold', 'Rose Gold', 'Silver', 'Bronze', 'Copper', 'Gunmetal'],
      },
    ],
  },
  {
    id: 'colors-neutral',
    name: 'Colors (Neutral)',
    description: 'Neutral tones',
    attributes: [
      {
        name: 'Color',
        values: ['Black', 'White', 'Cream', 'Beige', 'Tan', 'Brown', 'Charcoal'],
      },
    ],
  },
  {
    id: 'materials-jewelry',
    name: 'Materials (Jewelry)',
    description: 'Common jewelry materials',
    attributes: [
      {
        name: 'Material',
        values: ['Sterling Silver', '9ct Gold', '18ct Gold', 'Rose Gold', 'Stainless Steel'],
      },
    ],
  },
  {
    id: 'chain-lengths',
    name: 'Chain Lengths',
    description: 'Standard necklace lengths',
    attributes: [
      {
        name: 'Length',
        values: ['40cm', '45cm', '50cm', '55cm', '60cm'],
      },
    ],
  },
  {
    id: 'bracelet-sizes',
    name: 'Bracelet Sizes',
    description: 'Standard bracelet sizes',
    attributes: [
      {
        name: 'Size',
        values: ['S (16cm)', 'M (18cm)', 'L (20cm)', 'XL (22cm)'],
      },
    ],
  },
  {
    id: 'size-color-basic',
    name: 'Size + Color (Basic)',
    description: 'Common size and color combination',
    attributes: [
      {
        name: 'Size',
        values: ['S', 'M', 'L', 'XL'],
      },
      {
        name: 'Color',
        values: ['Black', 'White', 'Grey', 'Navy'],
      },
    ],
  },
  {
    id: 'art-print-sizes',
    name: 'Art Print Sizes',
    description: 'Standard art print sizes',
    attributes: [
      {
        name: 'Size',
        values: ['A4', 'A3', 'A2', 'A1', '8x10"', '11x14"', '16x20"'],
      },
    ],
  },
  {
    id: 'frame-options',
    name: 'Frame Options',
    description: 'Framing options for prints',
    attributes: [
      {
        name: 'Framing',
        values: ['Unframed', 'Black Frame', 'White Frame', 'Natural Wood Frame'],
      },
    ],
  },
  {
    id: 'candle-sizes',
    name: 'Candle Sizes',
    description: 'Standard candle sizes',
    attributes: [
      {
        name: 'Size',
        values: ['Small (100g)', 'Medium (200g)', 'Large (400g)', 'Extra Large (600g)'],
      },
    ],
  },
]

/**
 * Common attribute name suggestions
 */
export const COMMON_ATTRIBUTE_NAMES = [
  'Size',
  'Color',
  'Colour',
  'Material',
  'Style',
  'Length',
  'Width',
  'Weight',
  'Finish',
  'Pattern',
  'Scent',
  'Flavour',
  'Ring Size',
  'Frame',
  'Quantity',
]

/**
 * Stock status thresholds
 */
export const STOCK_STATUS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK: 5,
  IN_STOCK: Infinity,
} as const

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate SKU from options
 */
export function generateSku(
  prefix: string,
  options: Record<string, string>,
  index?: number
): string {
  const optionParts = Object.values(options)
    .map((value) => {
      // Convert value to SKU-friendly format
      return value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 4)
    })
    .join('-')

  const base = prefix ? `${prefix}-${optionParts}` : optionParts
  return index !== undefined ? `${base}-${String(index).padStart(3, '0')}` : base
}

/**
 * Calculate total combinations from attributes
 */
export function calculateCombinations(attributes: { values: unknown[] }[]): number {
  if (attributes.length === 0) return 0
  return attributes.reduce((total, attr) => total * (attr.values.length || 1), 1)
}
