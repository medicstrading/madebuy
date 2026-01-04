/**
 * Collection - groups pieces together for display
 */

export interface Collection {
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string
  coverMediaId?: string
  pieceIds: string[]
  isPublished: boolean
  isFeatured?: boolean
  sortOrder?: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateCollectionInput {
  name: string
  slug?: string
  description?: string
  coverMediaId?: string
  pieceIds?: string[]
  isPublished?: boolean
  isFeatured?: boolean
  sortOrder?: number
}

export interface UpdateCollectionInput {
  name?: string
  slug?: string
  description?: string
  coverMediaId?: string
  pieceIds?: string[]
  isPublished?: boolean
  isFeatured?: boolean
  sortOrder?: number
}

export interface CollectionListOptions {
  isPublished?: boolean
  isFeatured?: boolean
  limit?: number
  offset?: number
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CollectionWithPieces extends Collection {
  pieces: {
    id: string
    name: string
    price?: number
    thumbnailUrl?: string
  }[]
}
