'use client'

import type { PieceWithMedia } from '@madebuy/shared'
import {
  ArrowRight,
  Heart,
  ImageIcon,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { formatCurrency } from '@/lib/utils'

interface WishlistContentProps {
  tenant: string
  tenantId: string
  allPieces: PieceWithMedia[]
}

export function WishlistContent({
  tenant,
  tenantId,
  allPieces,
}: WishlistContentProps) {
  const { addItem } = useCart()
  const { pieceIds, removeFromWishlist } = useWishlist()

  const handleRemove = async (pieceId: string) => {
    await removeFromWishlist(pieceId)
  }

  const moveToCart = async (piece: PieceWithMedia) => {
    addItem(piece as any, { quantity: 1 })
    await removeFromWishlist(piece.id)
  }

  // Get the pieces that are in the wishlist
  const wishlistPieces = pieceIds
    .map((pieceId: string) =>
      allPieces.find((p: PieceWithMedia) => p.id === pieceId),
    )
    .filter((p): p is PieceWithMedia => p !== undefined)

  if (wishlistPieces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
          <Heart className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Your wishlist is empty
        </h2>
        <p className="text-gray-600 mb-8">Save items you love for later</p>
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Explore Products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wishlistPieces.map((piece: PieceWithMedia) => (
        <div
          key={piece.id}
          className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Image */}
          <Link
            href={`/${tenant}/product/${piece.slug}`}
            className="relative block aspect-square bg-gray-50"
          >
            {piece.primaryImage ? (
              <Image
                src={
                  piece.primaryImage.variants.thumb?.url ||
                  piece.primaryImage.variants.original.url
                }
                alt={piece.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageIcon className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </Link>

          {/* Details */}
          <div className="p-4">
            <Link
              href={`/${tenant}/product/${piece.slug}`}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
            >
              {piece.name}
            </Link>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(piece.price, piece.currency)}
            </p>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => moveToCart(piece)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                onClick={() => handleRemove(piece.id)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
