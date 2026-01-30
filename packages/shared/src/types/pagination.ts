/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  /** Maximum number of items to return (default: 50, max: 500) */
  limit?: number
  /** Cursor token from previous response for fetching next page */
  cursor?: string
  /** Field to sort by (default: createdAt) */
  sortBy?: string
  /** Sort order (default: desc) */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated result wrapper with cursor-based navigation
 */
export interface PaginatedResult<T> {
  /** Array of items for current page */
  data: T[]
  /** Cursor token for next page (null if no more pages) */
  nextCursor: string | null
  /** Whether there are more items after current page */
  hasMore: boolean
  /** Total count of items (optional - may be expensive for large datasets) */
  total?: number
}
