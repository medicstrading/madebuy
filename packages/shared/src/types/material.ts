/**
 * Material - Raw materials/supplies for tracking costs
 */

export interface Material {
  id: string
  tenantId: string

  name: string
  category: MaterialCategory

  // Inventory
  quantityInStock: number
  unit: MaterialUnit
  reorderPoint: number
  isLowStock: boolean

  // Pricing
  costPerUnit: number
  currency: string

  // Supplier
  supplier?: string
  supplierSku?: string

  // Metadata
  notes?: string
  tags: string[]

  // Invoice tracking
  invoiceIds?: string[] // Track which invoices restocked this material
  lastRestocked?: Date

  createdAt: Date
  updatedAt: Date
}

export type MaterialCategory =
  | 'stone'
  | 'metal'
  | 'wire'
  | 'chain'
  | 'finding'
  | 'bead'
  | 'tool'
  | 'packaging'
  | 'other'

export type MaterialUnit = 'gram' | 'piece' | 'meter' | 'set' | 'ml' | 'kg'

export interface MaterialUsage {
  id: string
  tenantId: string
  pieceId: string
  materialId: string

  quantityUsed: number
  costAtTime: number // Cost per unit when used (historical snapshot)
  totalCost: number // quantityUsed * costAtTime

  createdAt: Date
}

export interface CreateMaterialInput {
  name: string
  category: MaterialCategory
  quantityInStock: number
  unit: MaterialUnit
  reorderPoint: number
  costPerUnit: number
  currency?: string
  supplier?: string
  supplierSku?: string
  notes?: string
  tags?: string[]
}

export interface UpdateMaterialInput {
  name?: string
  category?: MaterialCategory
  quantityInStock?: number
  unit?: MaterialUnit
  reorderPoint?: number
  costPerUnit?: number
  currency?: string
  supplier?: string
  supplierSku?: string
  notes?: string
  tags?: string[]
}

export interface MaterialFilters {
  category?: MaterialCategory
  isLowStock?: boolean
  search?: string
}
