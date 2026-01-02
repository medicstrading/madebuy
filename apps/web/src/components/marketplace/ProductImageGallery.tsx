'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Heart, Share2, Package } from 'lucide-react'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  featured?: boolean
  discount?: number
}

export function ProductImageGallery({
  images,
  productName,
  featured,
  discount = 0,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="group relative aspect-square overflow-hidden rounded-2xl bg-mb-cream">
        {images.length > 0 ? (
          <Image
            src={images[selectedImage]}
            alt={productName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-24 w-24 text-mb-slate-light" />
          </div>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setSelectedImage((prev) =>
                  prev > 0 ? prev - 1 : images.length - 1
                )
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setSelectedImage((prev) =>
                  prev < images.length - 1 ? prev + 1 : 0
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg text-mb-slate hover:bg-white hover:text-mb-blue transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {featured && (
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
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, index) => (
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
                alt={`${productName} - Image ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
