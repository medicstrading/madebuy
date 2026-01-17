/**
 * InventoryReconciliation - Stock count sessions for verifying actual vs expected quantities
 */

export interface InventoryReconciliation {
  id: string
  tenantId: string

  // Session info
  status: ReconciliationStatus
  reconciliationDate: Date

  // Items counted
  items: ReconciliationItem[]

  // Summary
  totalItemsCounted: number
  totalDiscrepancies: number
  totalAdjustmentValue: number // Sum of all adjustments in cents (+ or -)

  // Metadata
  notes?: string

  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export type ReconciliationStatus = 'in_progress' | 'completed' | 'cancelled'

/**
 * Individual item in a stock count
 */
export interface ReconciliationItem {
  id: string

  // Material or Piece
  itemType: 'material' | 'piece'
  itemId: string
  itemName: string // Snapshot for display
  unit?: string // For materials

  // Stock count
  expectedQuantity: number // What system shows
  actualQuantity: number // What was physically counted
  discrepancy: number // actualQuantity - expectedQuantity

  // Adjustment tracking
  adjustmentReason?: ReconciliationReason
  notes?: string

  // Cost impact (for materials)
  costPerUnit?: number
  totalAdjustmentValue?: number // discrepancy * costPerUnit

  countedAt?: Date
}

export type ReconciliationReason =
  | 'damaged'
  | 'lost'
  | 'theft'
  | 'found'
  | 'counting_error'
  | 'system_error'
  | 'waste'
  | 'other'

export const RECONCILIATION_REASON_LABELS: Record<
  ReconciliationReason,
  string
> = {
  damaged: 'Damaged',
  lost: 'Lost',
  theft: 'Theft',
  found: 'Found extra',
  counting_error: 'Counting error',
  system_error: 'System error',
  waste: 'Waste/scraps',
  other: 'Other',
}

export interface CreateReconciliationInput {
  reconciliationDate?: Date
  notes?: string
}

export interface AddReconciliationItemInput {
  itemType: 'material' | 'piece'
  itemId: string
}

export interface UpdateReconciliationItemInput {
  actualQuantity: number
  adjustmentReason?: ReconciliationReason
  notes?: string
}

export interface ReconciliationFilters {
  status?: ReconciliationStatus
  dateFrom?: Date
  dateTo?: Date
  hasDiscrepancies?: boolean
}

export interface ReconciliationListOptions extends ReconciliationFilters {
  limit?: number
  offset?: number
}
