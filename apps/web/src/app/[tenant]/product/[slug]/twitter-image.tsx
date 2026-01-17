import { ImageResponse } from 'next/og'
import { getTenantBySlug } from '@/lib/tenant'
import { getPieceBySlug, populatePieceWithMedia } from '@/lib/pieces'

// Use Node.js runtime for MongoDB access
export const runtime = 'nodejs'
export const alt = 'Product image'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { tenant: string; slug: string } }) {
  // Fetch tenant
  const tenant = await getTenantBySlug(params.tenant)
  if (!tenant) {
    return fallbackImage('Shop Not Found')
  }

  // Fetch product
  const rawPiece = await getPieceBySlug(tenant.id, params.slug)
  if (!rawPiece) {
    return fallbackImage('Product Not Found', tenant.businessName)
  }

  const piece = await populatePieceWithMedia(rawPiece)
  const businessName = tenant.businessName
  const currency = piece.currency || 'AUD'

  // Get product image URL
  const imageUrl = piece.primaryImage?.variants?.large?.url ||
    piece.primaryImage?.variants?.original?.url || null

  const price = piece.price ? `$${piece.price.toLocaleString()} ${currency}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #FFFBF7 0%, #FEF3E2 50%, #FDE8D0 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Product image section */}
        <div
          style={{
            width: '50%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={piece.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                borderRadius: 16,
                fontSize: 120,
                color: '#F59E0B',
              }}
            >
              {piece.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Product info section */}
        <div
          style={{
            width: '50%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 40px 40px 20px',
          }}
        >
          {/* Brand/Seller */}
          <div
            style={{
              fontSize: 18,
              color: '#F59E0B',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {businessName}
          </div>

          {/* Product name */}
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: '#1F2937',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            {piece.name.length > 50 ? piece.name.slice(0, 47) + '...' : piece.name}
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: 80,
              height: 4,
              background: 'linear-gradient(90deg, #F59E0B, #FB923C)',
              borderRadius: 2,
              marginBottom: 20,
            }}
          />

          {/* Price */}
          {price && (
            <div
              style={{
                fontSize: 36,
                color: '#1F2937',
                fontWeight: 700,
              }}
            >
              {price}
            </div>
          )}

          {/* MadeBuy branding */}
          <div
            style={{
              marginTop: 'auto',
              fontSize: 16,
              color: '#9CA3AF',
            }}
          >
            madebuy.com.au
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

function fallbackImage(message: string, subtitle?: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFFBF7 0%, #FEF3E2 50%, #FDE8D0 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, color: '#1F2937', fontWeight: 600 }}>{message}</div>
        {subtitle && (
          <div style={{ fontSize: 24, color: '#6B7280', marginTop: 16 }}>{subtitle}</div>
        )}
      </div>
    ),
    { ...size }
  )
}
