/**
 * Accounting Connection Types
 * For Xero, MYOB, QuickBooks integrations
 */

export type AccountingProvider = 'xero' | 'myob' | 'quickbooks'

export type AccountingConnectionStatus = 'connected' | 'needs_reauth' | 'error' | 'disconnected'

export type SyncStatus = 'success' | 'failed' | 'partial'

/**
 * Account mappings for syncing transactions to accounting software
 */
export interface AccountMappings {
  productSales: string       // Revenue account code (e.g., "200" for Sales)
  shippingIncome: string     // Shipping revenue account
  platformFees: string       // Expense account for MadeBuy fees
  paymentFees: string        // Expense account for Stripe/payment processor fees
  bankAccount: string        // Bank account code for settlements
}

/**
 * Accounting connection record
 * Stores OAuth tokens and sync configuration for each provider
 */
export interface AccountingConnection {
  id: string
  tenantId: string
  provider: AccountingProvider

  // OAuth tokens (encrypted at rest in DB)
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date

  // Provider-specific identifiers
  externalTenantId: string    // Xero org ID / MYOB company file ID / QBO company ID
  externalTenantName?: string // Human-readable name (e.g., "My Business Pty Ltd")

  // Account mappings for journal entries
  accountMappings: AccountMappings

  // Sync state tracking
  lastSyncAt?: Date
  lastSyncStatus?: SyncStatus
  lastSyncError?: string

  // Connection health
  status: AccountingConnectionStatus

  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a new accounting connection
 */
export interface CreateAccountingConnectionInput {
  provider: AccountingProvider
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  externalTenantId: string
  externalTenantName?: string
  accountMappings: AccountMappings
}

/**
 * Input for updating an existing connection
 */
export interface UpdateAccountingConnectionInput {
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  externalTenantName?: string
  accountMappings?: Partial<AccountMappings>
  status?: AccountingConnectionStatus
}

/**
 * Input for updating sync status
 */
export interface UpdateSyncStatusInput {
  lastSyncAt: Date
  lastSyncStatus: SyncStatus
  lastSyncError?: string
}
