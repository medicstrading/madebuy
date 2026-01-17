/**
 * Material - Raw materials/supplies for tracking costs
 */
export interface Material {
  id: string
  tenantId: string
  name: string
  category: MaterialCategory
  quantityInStock: number
  unit: MaterialUnit
  reorderPoint: number
  isLowStock: boolean
  costPerUnit: number
  currency: string
  supplier?: string
  supplierSku?: string
  notes?: string
  tags: string[]
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
  costAtTime: number
  totalCost: number
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
