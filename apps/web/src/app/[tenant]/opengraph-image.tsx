import { ImageResponse } from 'next/og'
import { getTenantBySlug } from '@/lib/tenant'
import { media } from '@madebuy/db'

// Use Node.js runtime for MongoDB access
export const runtime = 'nodejs'
export const alt = 'Shop storefront'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { tenant: string } }) {
  // Fetch tenant
  const tenant = await getTenantBySlug(params.tenant)
  if (!tenant) {
    return fallbackImage('Shop Not Found')
  }

  // Get logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants?.original?.url || null
  }

  const businessName = tenant.businessName
  const description = tenant.description || 'Handmade products'
  const location = tenant.location || ''

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
        {/* Decorative top border */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '10px',
            background: 'linear-gradient(90deg, #F59E0B 0%, #FB923C 50%, #F59E0B 100%)',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          {/* Logo or initial */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              style={{
                width: 120,
                height: 120,
                objectFit: 'contain',
                marginBottom: 24,
              }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)',
              }}
            >
              <span style={{ color: 'white', fontSize: 56, fontWeight: 700 }}>
                {businessName.charAt(0)}
              </span>
            </div>
          )}

          {/* Business name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#1F2937',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {businessName}
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: 100,
              height: 4,
              background: 'linear-gradient(90deg, #F59E0B, #FB923C)',
              borderRadius: 2,
              marginBottom: 20,
            }}
          />

          {/* Description */}
          <div
            style={{
              fontSize: 24,
              color: '#6B7280',
              textAlign: 'center',
              maxWidth: 800,
            }}
          >
            {description.length > 100 ? description.slice(0, 97) + '...' : description}
          </div>

          {/* Location */}
          {location && (
            <div
              style={{
                fontSize: 18,
                color: '#9CA3AF',
                marginTop: 16,
              }}
            >
              📍 {location}
            </div>
          )}
        </div>

        {/* Decorative bottom border */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10px',
            background: 'linear-gradient(90deg, #F59E0B 0%, #FB923C 50%, #F59E0B 100%)',
          }}
        />

        {/* MadeBuy branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            fontSize: 16,
            color: '#9CA3AF',
          }}
        >
          Shop on madebuy.com.au
        </div>
      </div>
    ),
    { ...size }
  )
}

function fallbackImage(message: string) {
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
      </div>
    ),
    { ...size }
  )
}
