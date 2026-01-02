'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type ProductBadge = 'bestseller' | 'freeShipping' | 'sale' | 'ad'

import {
  Heart,
  Share2,
  Star,
  Truck,
  Shield,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  Minus,
  Plus,
  ShoppingBag,
} from 'lucide-react'
import { EtsyProductCard } from '@/components/marketplace/EtsyProductCard'
import { RecentlyViewed } from '@/components/marketplace/RecentlyViewed'

// Sample product data
const PRODUCT = {
  id: 'prod-123',
  name: 'Handcrafted Sterling Silver Crescent Moon Necklace with Natural Moonstone - Celestial Jewelry Collection',
  slug: 'moon-necklace',
  price: 89.99,
  originalPrice: 120.0,
  currency: 'AUD',
  images: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
  ],
  rating: 4.8,
  reviewCount: 247,
  salesCount: 1203,
  description: `This stunning crescent moon necklace is handcrafted with love using sterling silver and a genuine natural moonstone. Each piece is unique, featuring the ethereal glow that moonstones are famous for.

**Features:**
• 925 Sterling Silver chain and pendant
• Natural Rainbow Moonstone (8mm)
• Adjustable chain length: 16-18 inches
• Handmade with attention to detail
• Comes in a beautiful gift box

**Care Instructions:**
Store in a cool, dry place. Clean gently with a soft cloth. Avoid contact with perfumes and lotions.

Perfect for everyday wear or special occasions. Makes a thoughtful gift for moon lovers, astrology enthusiasts, or anyone who appreciates handcrafted jewelry.`,
  seller: {
    name: 'Moonlight Artisan Co',
    slug: 'moonlight-artisan',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    rating: 4.9,
    reviewCount: 1847,
    salesCount: 5420,
    location: 'Melbourne, VIC',
    memberSince: '2019',
    responseTime: 'Within 24 hours',
    isStarSeller: true,
  },
  shipping: {
    freeShipping: true,
    estimatedDelivery: '5-7 business days',
    shipsFrom: 'Melbourne, VIC',
    returnsAccepted: true,
    returnWindow: '30 days',
  },
  variations: {
    chainLength: ['16 inch', '18 inch', '20 inch'],
    finish: ['Polished Silver', 'Oxidized Silver'],
  },
  badges: ['bestseller', 'freeShipping'] as ProductBadge[],
  inStock: true,
  lowStock: true,
  stockCount: 3,
}

// Related products
const RELATED_PRODUCTS = [
  {
    id: '2',
    name: 'Celestial Star Stud Earrings - Sterling Silver',
    slug: 'star-earrings',
    price: 45.0,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'],
    rating: 4.7,
    reviewCount: 156,
    seller: { name: 'Moonlight Artisan Co', slug: 'moonlight-artisan' },
    badges: ['freeShipping'] as ProductBadge[],
  },
  {
    id: '3',
    name: 'Sun & Moon Mismatched Earrings',
    slug: 'sun-moon-earrings',
    price: 58.0,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800'],
    rating: 4.9,
    reviewCount: 89,
    seller: { name: 'Moonlight Artisan Co', slug: 'moonlight-artisan' },
    badges: ['bestseller'] as ProductBadge[],
  },
  {
    id: '4',
    name: 'Galaxy Pendant with Labradorite',
    slug: 'galaxy-pendant',
    price: 125.0,
    originalPrice: 150.0,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'],
    rating: 4.8,
    reviewCount: 203,
    seller: { name: 'Moonlight Artisan Co', slug: 'moonlight-artisan' },
    badges: ['sale'] as ProductBadge[],
  },
  {
    id: '5',
    name: 'Minimalist Moon Phase Ring',
    slug: 'moon-phase-ring',
    price: 72.0,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800'],
    rating: 4.6,
    reviewCount: 67,
    seller: { name: 'Moonlight Artisan Co', slug: 'moonlight-artisan' },
    badges: [] as ProductBadge[],
  },
]

// Sample reviews
const REVIEWS = [
  {
    id: '1',
    author: 'Sarah M.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    rating: 5,
    date: '2 weeks ago',
    text: 'Absolutely stunning! The moonstone has the most beautiful blue flash. Packaging was gorgeous and it arrived faster than expected. Will definitely be ordering more from this shop!',
    helpful: 24,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400'],
  },
  {
    id: '2',
    author: 'Emma L.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    rating: 5,
    date: '1 month ago',
    text: 'Bought this as a gift for my sister and she loved it! The quality is amazing for the price. The seller even included a handwritten note which was such a lovely touch.',
    helpful: 18,
  },
  {
    id: '3',
    author: 'Jessica K.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    rating: 4,
    date: '1 month ago',
    text: 'Beautiful necklace, exactly as pictured. Only reason for 4 stars is that the chain is a bit delicate - would have preferred something sturdier. But overall very happy with my purchase.',
    helpful: 12,
  },
]

// Recently viewed for demo
const RECENTLY_VIEWED = RELATED_PRODUCTS.slice(0, 4).map((p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  price: p.price,
  currency: p.currency,
  image: p.images[0],
  viewedAt: Date.now() - Math.random() * 1000000,
}))

export function ProductPageClient() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedChainLength, setSelectedChainLength] = useState('18 inch')
  const [selectedFinish, setSelectedFinish] = useState('Polished Silver')
  const [quantity, setQuantity] = useState(1)
  const [isFavorited, setIsFavorited] = useState(false)

  const discount = PRODUCT.originalPrice
    ? Math.round(((PRODUCT.originalPrice - PRODUCT.price) / PRODUCT.originalPrice) * 100)
    : 0

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-mb-sand bg-mb-cream">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-mb-slate-light">
            <Link href="/marketplace" className="hover:text-mb-blue">
              Marketplace
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/marketplace/categories/jewelry" className="hover:text-mb-blue">
              Jewelry
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/marketplace/categories/jewelry/necklaces" className="hover:text-mb-blue">
              Necklaces
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-mb-slate truncate max-w-[200px]">{PRODUCT.name}</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Product Section */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="group relative aspect-square overflow-hidden rounded-2xl bg-mb-cream">
              <Image
                src={PRODUCT.images[selectedImage]}
                alt={PRODUCT.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />

              {/* Navigation Arrows */}
              <button
                onClick={() =>
                  setSelectedImage((prev) =>
                    prev > 0 ? prev - 1 : PRODUCT.images.length - 1
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() =>
                  setSelectedImage((prev) =>
                    prev < PRODUCT.images.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Badges */}
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {PRODUCT.badges.includes('bestseller') && (
                  <span className="rounded-full bg-mb-accent px-3 py-1 text-xs font-semibold text-white shadow-md">
                    Bestseller
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                    {discount}% OFF
                  </span>
                )}
              </div>

              {/* Favorite & Share */}
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all ${
                    isFavorited
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/90 text-mb-slate hover:bg-white hover:text-rose-500'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {PRODUCT.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg transition-all ${
                    selectedImage === index
                      ? 'ring-2 ring-mb-blue ring-offset-2'
                      : 'ring-1 ring-mb-sand hover:ring-mb-blue'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${PRODUCT.name} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Seller Link */}
            <Link
              href={`/${PRODUCT.seller.slug}`}
              className="inline-flex items-center gap-2 text-sm text-mb-slate-light hover:text-mb-blue transition-colors"
            >
              <div className="relative h-6 w-6 overflow-hidden rounded-full">
                <Image
                  src={PRODUCT.seller.avatar}
                  alt={PRODUCT.seller.name}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-medium">{PRODUCT.seller.name}</span>
              {PRODUCT.seller.isStarSeller && (
                <span className="rounded-full bg-mb-sky px-2 py-0.5 text-[10px] font-semibold text-mb-blue">
                  Star Seller
                </span>
              )}
            </Link>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-mb-slate leading-tight lg:text-3xl">
              {PRODUCT.name}
            </h1>

            {/* Rating & Sales */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(PRODUCT.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-mb-sand text-mb-sand'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium text-mb-slate">{PRODUCT.rating}</span>
                <span className="text-mb-slate-light">({PRODUCT.reviewCount} reviews)</span>
              </div>
              <span className="text-mb-slate-light">|</span>
              <span className="text-mb-slate-light">{PRODUCT.salesCount.toLocaleString()} sales</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-mb-slate">
                ${PRODUCT.price.toFixed(2)}
              </span>
              {PRODUCT.originalPrice && (
                <>
                  <span className="text-lg text-mb-slate-light line-through">
                    ${PRODUCT.originalPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-sm font-semibold text-rose-600">
                    Save ${(PRODUCT.originalPrice - PRODUCT.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Low Stock Warning */}
            {PRODUCT.lowStock && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                <span>
                  Only <strong>{PRODUCT.stockCount} left</strong> - order soon!
                </span>
              </div>
            )}

            {/* Variations */}
            <div className="space-y-4 border-t border-mb-sand pt-6">
              {/* Chain Length */}
              <div>
                <label className="mb-2 block text-sm font-medium text-mb-slate">
                  Chain Length
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT.variations.chainLength.map((length) => (
                    <button
                      key={length}
                      onClick={() => setSelectedChainLength(length)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedChainLength === length
                          ? 'border-mb-blue bg-mb-sky text-mb-blue'
                          : 'border-mb-sand text-mb-slate hover:border-mb-blue'
                      }`}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              </div>

              {/* Finish */}
              <div>
                <label className="mb-2 block text-sm font-medium text-mb-slate">
                  Finish
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT.variations.finish.map((finish) => (
                    <button
                      key={finish}
                      onClick={() => setSelectedFinish(finish)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedFinish === finish
                          ? 'border-mb-blue bg-mb-sky text-mb-blue'
                          : 'border-mb-sand text-mb-slate hover:border-mb-blue'
                      }`}
                    >
                      {finish}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-2 block text-sm font-medium text-mb-slate">
                  Quantity
                </label>
                <div className="inline-flex items-center rounded-lg border-2 border-mb-sand">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium text-mb-slate">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(PRODUCT.stockCount, q + 1))}
                    className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-full bg-mb-blue px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-mb-blue/25 hover:bg-mb-blue-dark transition-all hover:shadow-xl hover:shadow-mb-blue/30 active:scale-[0.98]">
                <ShoppingBag className="h-5 w-5" />
                Add to cart
              </button>
              <button className="flex items-center justify-center gap-2 rounded-full border-2 border-mb-slate px-6 py-4 text-lg font-semibold text-mb-slate hover:bg-mb-cream transition-all">
                Buy it now
              </button>
            </div>

            {/* Shipping Info */}
            <div className="space-y-3 rounded-xl border border-mb-sand bg-mb-cream p-4">
              {PRODUCT.shipping.freeShipping && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-accent/10">
                    <Truck className="h-4 w-4 text-mb-accent" />
                  </div>
                  <div>
                    <span className="font-semibold text-mb-accent">Free shipping</span>
                    <span className="text-mb-slate-light"> to Australia</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                  <Package className="h-4 w-4 text-mb-blue" />
                </div>
                <div>
                  <span className="text-mb-slate">Arrives </span>
                  <span className="font-medium text-mb-slate">{PRODUCT.shipping.estimatedDelivery}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                  <MapPin className="h-4 w-4 text-mb-blue" />
                </div>
                <div>
                  <span className="text-mb-slate">Ships from </span>
                  <span className="font-medium text-mb-slate">{PRODUCT.shipping.shipsFrom}</span>
                </div>
              </div>
              {PRODUCT.shipping.returnsAccepted && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mb-sky">
                    <RefreshCw className="h-4 w-4 text-mb-blue" />
                  </div>
                  <div>
                    <span className="font-medium text-mb-slate">{PRODUCT.shipping.returnWindow} returns</span>
                    <span className="text-mb-slate-light"> accepted</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 text-xs text-mb-slate-light">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>Quality guarantee</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>Direct seller support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Details */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Description */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold text-mb-slate">Description</h2>
            <div className="prose prose-slate max-w-none">
              {PRODUCT.description.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-mb-slate-light whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Seller Card */}
          <div>
            <div className="sticky top-24 rounded-xl border border-mb-sand bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-mb-sky">
                  <Image
                    src={PRODUCT.seller.avatar}
                    alt={PRODUCT.seller.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-mb-slate">{PRODUCT.seller.name}</h3>
                  {PRODUCT.seller.isStarSeller && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-mb-blue text-mb-blue" />
                      <span className="font-medium text-mb-blue">Star Seller</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-mb-cream p-3">
                  <div className="text-lg font-bold text-mb-slate">{PRODUCT.seller.salesCount.toLocaleString()}</div>
                  <div className="text-xs text-mb-slate-light">Sales</div>
                </div>
                <div className="rounded-lg bg-mb-cream p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-bold text-mb-slate">{PRODUCT.seller.rating}</span>
                  </div>
                  <div className="text-xs text-mb-slate-light">{PRODUCT.seller.reviewCount} reviews</div>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm text-mb-slate-light">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{PRODUCT.seller.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Replies {PRODUCT.seller.responseTime.toLowerCase()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href={`/${PRODUCT.seller.slug}`}
                  className="block w-full rounded-full border-2 border-mb-blue py-2 text-center text-sm font-semibold text-mb-blue hover:bg-mb-sky transition-colors"
                >
                  Visit shop
                </Link>
                <button className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-mb-sand py-2 text-sm font-medium text-mb-slate hover:border-mb-slate transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  Contact seller
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16 border-t border-mb-sand pt-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-mb-slate">Customer Reviews</h2>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(PRODUCT.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-mb-sand text-mb-sand'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-mb-slate">{PRODUCT.rating} out of 5</span>
                <span className="text-mb-slate-light">({PRODUCT.reviewCount} reviews)</span>
              </div>
            </div>
            <button className="rounded-full border-2 border-mb-sand px-4 py-2 text-sm font-medium text-mb-slate hover:border-mb-blue hover:text-mb-blue transition-colors">
              Write a review
            </button>
          </div>

          <div className="space-y-6">
            {REVIEWS.map((review) => (
              <div key={review.id} className="rounded-xl border border-mb-sand p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={review.avatar}
                        alt={review.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-mb-slate">{review.author}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-mb-sand text-mb-sand'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-mb-slate-light">{review.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mb-4 text-mb-slate-light">{review.text}</p>

                {review.images && review.images.length > 0 && (
                  <div className="mb-4 flex gap-2">
                    {review.images.map((image, index) => (
                      <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg">
                        <Image src={image} alt="Review image" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <button className="text-sm text-mb-slate-light hover:text-mb-blue transition-colors">
                  Helpful ({review.helpful})
                </button>
              </div>
            ))}
          </div>

          <button className="mt-6 w-full rounded-full border-2 border-mb-sand py-3 font-medium text-mb-slate hover:border-mb-blue hover:text-mb-blue transition-colors">
            See all {PRODUCT.reviewCount} reviews
          </button>
        </section>

        {/* More from this Shop */}
        <section className="mt-16 border-t border-mb-sand pt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-mb-slate">More from this shop</h2>
            <Link
              href={`/${PRODUCT.seller.slug}`}
              className="text-sm font-medium text-mb-blue hover:text-mb-blue-dark transition-colors"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {RELATED_PRODUCTS.map((product) => (
              <EtsyProductCard
                key={product.id}
                product={product}
                variant="compact"
                onQuickAdd={(id) => console.log('Quick add:', id)}
                onFavorite={(id) => console.log('Favorite:', id)}
              />
            ))}
          </div>
        </section>

        {/* Recently Viewed */}
        <section className="mt-16 border-t border-mb-sand pt-12">
          <RecentlyViewed products={RECENTLY_VIEWED} />
        </section>
      </main>

      {/* Sticky Mobile Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-mb-sand bg-white p-4 shadow-lg lg:hidden">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-lg font-bold text-mb-slate">${PRODUCT.price.toFixed(2)}</div>
            {PRODUCT.shipping.freeShipping && (
              <div className="text-xs text-mb-accent">Free shipping</div>
            )}
          </div>
          <button className="flex-1 flex items-center justify-center gap-2 rounded-full bg-mb-blue px-4 py-3 font-semibold text-white shadow-md">
            <ShoppingBag className="h-5 w-5" />
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}
