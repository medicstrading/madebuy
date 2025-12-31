'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Gem,
  Shirt,
  Palette,
  Home,
  Gift,
  Sparkles,
  Heart,
  Baby,
  Leaf,
  ChevronDown,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: React.ReactNode
  subcategories: {
    name: string
    slug: string
  }[]
  featuredImage?: string
  featuredTitle?: string
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'jewelry',
    name: 'Jewelry & Accessories',
    slug: 'jewelry',
    icon: <Gem className="h-5 w-5" />,
    subcategories: [
      { name: 'Necklaces', slug: 'necklaces' },
      { name: 'Earrings', slug: 'earrings' },
      { name: 'Rings', slug: 'rings' },
      { name: 'Bracelets', slug: 'bracelets' },
      { name: 'Watches', slug: 'watches' },
      { name: 'Body Jewelry', slug: 'body-jewelry' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    featuredTitle: 'Handcrafted jewelry from local artisans',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    slug: 'clothing',
    icon: <Shirt className="h-5 w-5" />,
    subcategories: [
      { name: 'Dresses', slug: 'dresses' },
      { name: 'Tops & Tees', slug: 'tops' },
      { name: 'Bottoms', slug: 'bottoms' },
      { name: 'Outerwear', slug: 'outerwear' },
      { name: 'Activewear', slug: 'activewear' },
      { name: 'Swimwear', slug: 'swimwear' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
    featuredTitle: 'Sustainable fashion, ethically made',
  },
  {
    id: 'art',
    name: 'Art & Collectibles',
    slug: 'art',
    icon: <Palette className="h-5 w-5" />,
    subcategories: [
      { name: 'Paintings', slug: 'paintings' },
      { name: 'Prints', slug: 'prints' },
      { name: 'Photography', slug: 'photography' },
      { name: 'Sculpture', slug: 'sculpture' },
      { name: 'Digital Art', slug: 'digital-art' },
      { name: 'Mixed Media', slug: 'mixed-media' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    featuredTitle: 'Original artwork for every space',
  },
  {
    id: 'home',
    name: 'Home & Living',
    slug: 'home-living',
    icon: <Home className="h-5 w-5" />,
    subcategories: [
      { name: 'Furniture', slug: 'furniture' },
      { name: 'Home Decor', slug: 'decor' },
      { name: 'Kitchenware', slug: 'kitchen' },
      { name: 'Bedding', slug: 'bedding' },
      { name: 'Storage', slug: 'storage' },
      { name: 'Outdoor', slug: 'outdoor' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=400',
    featuredTitle: 'Handmade pieces for your home',
  },
  {
    id: 'gifts',
    name: 'Gifts',
    slug: 'gifts',
    icon: <Gift className="h-5 w-5" />,
    subcategories: [
      { name: 'For Her', slug: 'for-her' },
      { name: 'For Him', slug: 'for-him' },
      { name: 'For Kids', slug: 'for-kids' },
      { name: 'Gift Sets', slug: 'gift-sets' },
      { name: 'Personalized', slug: 'personalized' },
      { name: 'Gift Cards', slug: 'gift-cards' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
    featuredTitle: 'Thoughtful gifts, wrapped with love',
  },
  {
    id: 'beauty',
    name: 'Beauty & Self-Care',
    slug: 'beauty',
    icon: <Sparkles className="h-5 w-5" />,
    subcategories: [
      { name: 'Skincare', slug: 'skincare' },
      { name: 'Bath & Body', slug: 'bath-body' },
      { name: 'Candles', slug: 'candles' },
      { name: 'Soaps', slug: 'soaps' },
      { name: 'Aromatherapy', slug: 'aromatherapy' },
      { name: 'Haircare', slug: 'haircare' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400',
    featuredTitle: 'Natural beauty, handcrafted care',
  },
  {
    id: 'wedding',
    name: 'Weddings',
    slug: 'weddings',
    icon: <Heart className="h-5 w-5" />,
    subcategories: [
      { name: 'Invitations', slug: 'invitations' },
      { name: 'Decorations', slug: 'decorations' },
      { name: 'Favors', slug: 'favors' },
      { name: 'Attire', slug: 'attire' },
      { name: 'Accessories', slug: 'accessories' },
      { name: 'Gifts', slug: 'wedding-gifts' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    featuredTitle: 'Make your special day unique',
  },
  {
    id: 'kids',
    name: 'Kids & Baby',
    slug: 'kids-baby',
    icon: <Baby className="h-5 w-5" />,
    subcategories: [
      { name: 'Toys', slug: 'toys' },
      { name: 'Clothing', slug: 'kids-clothing' },
      { name: 'Nursery', slug: 'nursery' },
      { name: 'Baby Shower', slug: 'baby-shower' },
      { name: 'Room Decor', slug: 'room-decor' },
      { name: 'Learning', slug: 'learning' },
    ],
    featuredImage: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400',
    featuredTitle: 'Safe, sustainable, and playful',
  },
]

interface MegaMenuProps {
  categories?: Category[]
  className?: string
}

export function MegaMenu({ categories = DEFAULT_CATEGORIES, className = '' }: MegaMenuProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setActiveCategory(categoryId)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveCategory(null)
    }, 150)
  }

  const handleMenuMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const activeData = categories.find((c) => c.id === activeCategory)

  return (
    <nav className={`relative ${className}`} ref={menuRef}>
      {/* Category Triggers */}
      <div className="flex items-center gap-1">
        {categories.slice(0, 6).map((category) => (
          <button
            key={category.id}
            onMouseEnter={() => handleMouseEnter(category.id)}
            onMouseLeave={handleMouseLeave}
            className={`
              group flex items-center gap-1.5 rounded-full px-3 py-2
              text-sm font-medium transition-all duration-200
              ${
                activeCategory === category.id
                  ? 'bg-mb-sky text-mb-blue'
                  : 'text-mb-slate hover:bg-mb-cream hover:text-mb-slate'
              }
            `}
          >
            <span className="hidden lg:inline">{category.icon}</span>
            <span>{category.name.split(' ')[0]}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                activeCategory === category.id ? 'rotate-180' : ''
              }`}
            />
          </button>
        ))}

        {/* More dropdown for remaining categories */}
        {categories.length > 6 && (
          <button
            onMouseEnter={() => handleMouseEnter('more')}
            onMouseLeave={handleMouseLeave}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-mb-slate hover:bg-mb-cream"
          >
            More
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mega Menu Dropdown */}
      {isOpen && activeData && (
        <div
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="
            absolute left-0 top-full z-50 mt-2 w-full min-w-[600px]
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <div className="rounded-xl border border-mb-sand bg-white p-6 shadow-xl">
            <div className="grid grid-cols-3 gap-8">
              {/* Subcategories */}
              <div className="col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-mb-blue">{activeData.icon}</span>
                  <h3 className="text-lg font-semibold text-mb-slate">
                    {activeData.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  {activeData.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/marketplace/categories/${activeData.slug}/${sub.slug}`}
                      className="
                        group/link flex items-center gap-2 rounded-lg px-2 py-1.5
                        text-sm text-mb-slate transition-colors
                        hover:bg-mb-cream hover:text-mb-blue
                      "
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-mb-sand transition-colors group-hover/link:bg-mb-blue" />
                      {sub.name}
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/marketplace/categories/${activeData.slug}`}
                  className="
                    mt-4 inline-flex items-center gap-1 text-sm font-medium
                    text-mb-blue hover:text-mb-blue-dark transition-colors
                  "
                >
                  Shop all {activeData.name.split(' ')[0]}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Featured Image */}
              <div className="relative overflow-hidden rounded-lg">
                {activeData.featuredImage && (
                  <>
                    <Image
                      src={activeData.featuredImage}
                      alt={activeData.featuredTitle || activeData.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-sm font-medium text-white">
                        {activeData.featuredTitle}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Popular Searches */}
            <div className="mt-6 border-t border-mb-sand pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mb-slate-light">
                Popular in {activeData.name.split(' ')[0]}
              </p>
              <div className="flex flex-wrap gap-2">
                {['Handmade', 'Personalized', 'Vintage', 'Gift ready', 'Free shipping'].map((tag) => (
                  <Link
                    key={tag}
                    href={`/marketplace/browse?category=${activeData.slug}&tag=${tag.toLowerCase().replace(' ', '-')}`}
                    className="
                      rounded-full border border-mb-sand px-3 py-1 text-xs font-medium
                      text-mb-slate transition-all
                      hover:border-mb-blue hover:bg-mb-sky hover:text-mb-blue
                    "
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/**
 * MegaMenuMobile - Slide-out drawer version for mobile
 */
interface MegaMenuMobileProps {
  categories?: Category[]
  isOpen: boolean
  onClose: () => void
}

export function MegaMenuMobile({
  categories = DEFAULT_CATEGORIES,
  isOpen,
  onClose,
}: MegaMenuMobileProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-xl animate-in slide-in-from-left duration-300">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-mb-sand px-4 py-3">
            <h2 className="text-lg font-semibold text-mb-slate">Categories</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-mb-slate hover:bg-mb-cream"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="border-b border-mb-sand">
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === category.id ? null : category.id
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-mb-blue">{category.icon}</span>
                    <span className="font-medium text-mb-slate">{category.name}</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-mb-slate-light transition-transform ${
                      expandedCategory === category.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedCategory === category.id && (
                  <div className="bg-mb-cream px-4 py-2 animate-in slide-in-from-top-2 duration-200">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/marketplace/categories/${category.slug}/${sub.slug}`}
                        onClick={onClose}
                        className="block py-2 pl-8 text-sm text-mb-slate hover:text-mb-blue"
                      >
                        {sub.name}
                      </Link>
                    ))}
                    <Link
                      href={`/marketplace/categories/${category.slug}`}
                      onClick={onClose}
                      className="mt-2 block py-2 pl-8 text-sm font-medium text-mb-blue"
                    >
                      Shop all →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
