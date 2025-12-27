'use client'

import { useState } from 'react'
import { TurnstileChallenge } from './TurnstileChallenge'
import { ProductImage } from './ProductImage'

interface ProtectedProductGalleryProps {
  images: Array<{
    src: string
    alt: string
  }>
}

/**
 * Product gallery protected by Turnstile bot detection
 * Shows challenge before revealing high-res images
 */
export function ProtectedProductGallery({ images }: ProtectedProductGalleryProps) {
  const [isVerified, setIsVerified] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleVerify = async (token: string) => {
    try {
      const response = await fetch('/api/marketplace/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        setIsVerified(true)
      } else {
        console.error('Verification failed')
      }
    } catch (error) {
      console.error('Error verifying:', error)
    }
  }

  if (!isVerified) {
    return <TurnstileChallenge onVerify={handleVerify} />
  }

  return (
    <div className="sticky top-24 space-y-4">
      {/* Main Image */}
      <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        <ProductImage
          src={images[selectedIndex]?.src || '/placeholder.jpg'}
          alt={images[selectedIndex]?.alt || 'Product image'}
          width={800}
          height={800}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
              selectedIndex === index
                ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            <ProductImage
              src={image.src}
              alt={image.alt}
              width={200}
              height={200}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* IP Protection Notice */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-xs text-blue-900">
          🛡️ Images are protected by MadeBuy&apos;s IP Protection system
        </p>
      </div>
    </div>
  )
}
