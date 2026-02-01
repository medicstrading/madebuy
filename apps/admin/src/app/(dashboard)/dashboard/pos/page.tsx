'use client'

import { pieces } from '@madebuy/db'
import type { Piece } from '@madebuy/shared'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { POSCart } from '@/components/pos/POSCart'
import { POSProductTile } from '@/components/pos/POSProductTile'

export default function POSPage() {
  const [allProducts, setAllProducts] = useState<Piece[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Piece[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState<
    Array<{
      piece: Piece
      quantity: number
      variantId?: string
      variantOptions?: Record<string, string>
      price: number
    }>
  >([])
  const [loading, setLoading] = useState(true)

  // Fetch available products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/pieces?status=available')
        if (res.ok) {
          const data = await res.json()
          const products = data.pieces || []
          setAllProducts(products)
          setFilteredProducts(products)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Filter products by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(allProducts)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(query)),
    )
    setFilteredProducts(filtered)
  }, [searchQuery, allProducts])

  // Add item to cart
  const addToCart = (
    piece: Piece,
    variantId?: string,
    variantOptions?: Record<string, string>,
  ) => {
    // Determine price (variant or piece)
    let finalPrice: number = piece.price ?? 0
    if (variantId && piece.variants) {
      const variant = piece.variants.find((v) => v.id === variantId)
      if (variant && variant.price !== undefined) {
        finalPrice = variant.price
      }
    }

    // Check if item already in cart
    const existingIndex = cartItems.findIndex(
      (item) => item.piece.id === piece.id && item.variantId === variantId,
    )

    if (existingIndex >= 0) {
      // Increment quantity
      const newItems = [...cartItems]
      newItems[existingIndex].quantity += 1
      setCartItems(newItems)
    } else {
      // Add new item
      const newItem = {
        piece,
        quantity: 1,
        variantId,
        variantOptions,
        price: finalPrice,
      }
      setCartItems([...cartItems, newItem])
    }
  }

  // Update item quantity
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index)
      return
    }

    const newItems = [...cartItems]
    newItems[index].quantity = quantity
    setCartItems(newItems)
  }

  // Remove item from cart
  const removeItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  // Clear cart after successful checkout
  const clearCart = () => {
    setCartItems([])
    setSearchQuery('')
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden touch-manipulation">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Point of Sale
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              In-person checkout for markets &amp; events
            </p>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors text-xs sm:text-sm font-medium"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit POS</span>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Products panel */}
        <div className="flex-1 flex flex-col overflow-hidden md:border-r border-gray-200 bg-white">
          {/* Search bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading products...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600 font-medium">No products found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 active:text-blue-800"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                {filteredProducts.map((piece) => (
                  <POSProductTile
                    key={piece.id}
                    piece={piece}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div className="w-full md:w-96 lg:w-[28rem] bg-white shadow-xl flex flex-col max-h-[50vh] md:max-h-none">
          <POSCart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onClearCart={clearCart}
          />
        </div>
      </div>
    </div>
  )
}
