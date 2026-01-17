'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

interface WishlistContextType {
  count: number
  pieceIds: string[]
  isInWishlist: (pieceId: string) => boolean
  addToWishlist: (pieceId: string) => Promise<void>
  removeFromWishlist: (pieceId: string) => Promise<void>
  refresh: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
)

export function WishlistProvider({
  children,
  tenantId,
}: {
  children: ReactNode
  tenantId: string
}) {
  const [pieceIds, setPieceIds] = useState<string[]>([])
  const [_isLoading, setIsLoading] = useState(true)

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await fetch(`/api/wishlist?tenantId=${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        const ids = (data.items || []).map(
          (item: { pieceId: string }) => item.pieceId,
        )
        setPieceIds(ids)
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const isInWishlist = useCallback(
    (pieceId: string) => {
      return pieceIds.includes(pieceId)
    },
    [pieceIds],
  )

  const addToWishlist = useCallback(
    async (pieceId: string) => {
      // Optimistic update - add immediately
      setPieceIds((prev) => [...prev, pieceId])

      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, pieceId }),
        })
        if (!response.ok) {
          // Rollback on failure
          setPieceIds((prev) => prev.filter((id) => id !== pieceId))
          console.error('Failed to add to wishlist: API error')
        }
      } catch (error) {
        // Rollback on network error
        setPieceIds((prev) => prev.filter((id) => id !== pieceId))
        console.error('Failed to add to wishlist:', error)
      }
    },
    [tenantId],
  )

  const removeFromWishlist = useCallback(
    async (pieceId: string) => {
      // Optimistic update - remove immediately
      setPieceIds((prev) => prev.filter((id) => id !== pieceId))

      try {
        const response = await fetch(
          `/api/wishlist?tenantId=${tenantId}&pieceId=${pieceId}`,
          { method: 'DELETE' },
        )
        if (!response.ok) {
          // Rollback on failure - add back
          setPieceIds((prev) => [...prev, pieceId])
          console.error('Failed to remove from wishlist: API error')
        }
      } catch (error) {
        // Rollback on network error - add back
        setPieceIds((prev) => [...prev, pieceId])
        console.error('Failed to remove from wishlist:', error)
      }
    },
    [tenantId],
  )

  return (
    <WishlistContext.Provider
      value={{
        count: pieceIds.length,
        pieceIds,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refresh: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return context
}
