/**
 * Maker Type System - Category Presets
 *
 * MadeBuy supports multiple maker types, each with their own
 * preset product and material categories.
 */

export type MakerType =
  | 'jewelry'
  | 'clothing'
  | 'art'
  | 'ceramics'
  | 'woodwork'
  | 'textiles'
  | 'leather'
  | 'candles'
  | 'soap'
  | 'food'
  | 'custom'

export interface MakerTypeInfo {
  id: MakerType
  name: string
  description: string
  icon: string // Lucide icon name
}

export const MAKER_TYPES: MakerTypeInfo[] = [
  {
    id: 'jewelry',
    name: 'Jewelry',
    description: 'Rings, necklaces, earrings, bracelets, and accessories',
    icon: 'Gem',
  },
  {
    id: 'clothing',
    name: 'Clothing & Apparel',
    description: 'Dresses, tops, pants, and wearable items',
    icon: 'Shirt',
  },
  {
    id: 'art',
    name: 'Art & Prints',
    description: 'Paintings, prints, sculptures, and photography',
    icon: 'Palette',
  },
  {
    id: 'ceramics',
    name: 'Ceramics & Pottery',
    description: 'Mugs, bowls, plates, vases, and clay work',
    icon: 'Coffee',
  },
  {
    id: 'woodwork',
    name: 'Woodwork & Furniture',
    description: 'Furniture, home decor, toys, and wood carvings',
    icon: 'TreeDeciduous',
  },
  {
    id: 'textiles',
    name: 'Textiles & Fiber Arts',
    description: 'Quilts, blankets, pillows, rugs, and wall hangings',
    icon: 'Scissors',
  },
  {
    id: 'leather',
    name: 'Leather Goods',
    description: 'Bags, wallets, belts, journals, and accessories',
    icon: 'Briefcase',
  },
  {
    id: 'candles',
    name: 'Candles & Home Fragrance',
    description: 'Candles, wax melts, diffusers, and room sprays',
    icon: 'Flame',
  },
  {
    id: 'soap',
    name: 'Bath & Body',
    description: 'Soaps, bath bombs, skincare, and body products',
    icon: 'Droplets',
  },
  {
    id: 'food',
    name: 'Food & Confectionery',
    description: 'Baked goods, preserves, confectionery, and beverages',
    icon: 'CakeSlice',
  },
  {
    id: 'custom',
    name: 'Custom / Other',
    description: 'Define your own categories from scratch',
    icon: 'Sparkles',
  },
]

/**
 * Product category presets by maker type
 */
export const MAKER_CATEGORY_PRESETS: Record<MakerType, string[]> = {
  jewelry: [
    'Rings',
    'Necklaces',
    'Earrings',
    'Bracelets',
    'Pendants',
    'Brooches',
    'Anklets',
    'Hair Accessories',
  ],
  clothing: [
    'Dresses',
    'Tops',
    'Pants',
    'Skirts',
    'Jackets',
    'Coats',
    'Accessories',
    'Swimwear',
  ],
  art: [
    'Paintings',
    'Prints',
    'Sculptures',
    'Photography',
    'Mixed Media',
    'Digital Art',
    'Illustrations',
  ],
  ceramics: [
    'Mugs',
    'Bowls',
    'Plates',
    'Vases',
    'Figurines',
    'Tiles',
    'Planters',
    'Serving Ware',
  ],
  woodwork: [
    'Furniture',
    'Home Decor',
    'Toys',
    'Utensils',
    'Carvings',
    'Boxes',
    'Cutting Boards',
    'Frames',
  ],
  textiles: [
    'Quilts',
    'Blankets',
    'Pillows',
    'Rugs',
    'Wall Hangings',
    'Table Linens',
    'Bags',
    'Clothing',
  ],
  leather: [
    'Bags',
    'Wallets',
    'Belts',
    'Journals',
    'Accessories',
    'Phone Cases',
    'Key Holders',
    'Watch Straps',
  ],
  candles: [
    'Candles',
    'Wax Melts',
    'Diffusers',
    'Room Sprays',
    'Incense',
    'Reed Diffusers',
  ],
  soap: [
    'Bar Soaps',
    'Liquid Soaps',
    'Bath Bombs',
    'Shower Steamers',
    'Skincare',
    'Body Butter',
    'Lip Balm',
  ],
  food: [
    'Baked Goods',
    'Preserves',
    'Confectionery',
    'Beverages',
    'Sauces',
    'Spice Blends',
    'Gift Boxes',
  ],
  custom: [],
}

/**
 * Material category presets by maker type
 */
export const MAKER_MATERIAL_PRESETS: Record<MakerType, string[]> = {
  jewelry: [
    'Metal',
    'Gemstone',
    'Wire',
    'Chain',
    'Findings',
    'Beads',
    'Cord',
    'Resin',
    'Tools',
    'Packaging',
  ],
  clothing: [
    'Fabric',
    'Thread',
    'Buttons',
    'Zippers',
    'Elastic',
    'Interfacing',
    'Lining',
    'Trim',
    'Labels',
    'Packaging',
  ],
  art: [
    'Canvas',
    'Paint',
    'Brushes',
    'Paper',
    'Ink',
    'Frames',
    'Pencils',
    'Pastels',
    'Mediums',
    'Varnish',
  ],
  ceramics: [
    'Clay',
    'Glaze',
    'Slip',
    'Kiln Supplies',
    'Tools',
    'Molds',
    'Oxides',
    'Underglazes',
    'Packaging',
  ],
  woodwork: [
    'Lumber',
    'Plywood',
    'Veneer',
    'Stain',
    'Finish',
    'Hardware',
    'Sandpaper',
    'Adhesive',
    'Tools',
    'Packaging',
  ],
  textiles: [
    'Fabric',
    'Batting',
    'Thread',
    'Backing',
    'Binding',
    'Interfacing',
    'Stuffing',
    'Notions',
    'Labels',
  ],
  leather: [
    'Leather',
    'Thread',
    'Hardware',
    'Dye',
    'Finish',
    'Tools',
    'Adhesive',
    'Edge Paint',
    'Lining',
    'Packaging',
  ],
  candles: [
    'Wax',
    'Wicks',
    'Fragrance Oil',
    'Dye',
    'Containers',
    'Labels',
    'Packaging',
    'Tools',
    'Warning Labels',
  ],
  soap: [
    'Oils',
    'Lye',
    'Fragrance',
    'Colorants',
    'Additives',
    'Molds',
    'Packaging',
    'Labels',
    'Butters',
    'Clays',
  ],
  food: [
    'Ingredients',
    'Packaging',
    'Labels',
    'Equipment',
    'Containers',
    'Decorations',
    'Gift Boxes',
  ],
  custom: [],
}

/**
 * Get all categories for a tenant (preset + custom)
 */
export function getTenantCategories(
  makerType: MakerType | undefined,
  customCategories: string[] = [],
): string[] {
  const presets = makerType ? MAKER_CATEGORY_PRESETS[makerType] : []
  // Combine presets with custom, removing duplicates
  return [...new Set([...presets, ...customCategories])]
}

/**
 * Get all material categories for a tenant (preset + custom)
 */
export function getTenantMaterialCategories(
  makerType: MakerType | undefined,
  customMaterialCategories: string[] = [],
): string[] {
  const presets = makerType ? MAKER_MATERIAL_PRESETS[makerType] : []
  return [...new Set([...presets, ...customMaterialCategories])]
}

/**
 * Get maker type info by ID
 */
export function getMakerTypeInfo(
  makerType: MakerType,
): MakerTypeInfo | undefined {
  return MAKER_TYPES.find((mt) => mt.id === makerType)
}
