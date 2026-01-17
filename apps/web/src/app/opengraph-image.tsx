import { ImageResponse } from 'next/og'

export const alt = 'MadeBuy - Handmade Marketplace'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, #FFFBF7 0%, #FEF3E2 50%, #FDE8D0 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Decorative top border - amber gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '10px',
          background:
            'linear-gradient(90deg, #F59E0B 0%, #FB923C 50%, #F59E0B 100%)',
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
        {/* Logo mark */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)',
          }}
        >
          <span style={{ color: 'white', fontSize: 48, fontWeight: 700 }}>
            M
          </span>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#1F2937',
            marginBottom: '16px',
            letterSpacing: '-2px',
          }}
        >
          MadeBuy
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: '120px',
            height: '4px',
            background: 'linear-gradient(90deg, #F59E0B, #FB923C)',
            borderRadius: '2px',
            marginBottom: '24px',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#4B5563',
            textAlign: 'center',
            maxWidth: '800px',
            fontWeight: 500,
          }}
        >
          Handmade Marketplace
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: '#6B7280',
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          Discover unique products from talented Australian makers
        </div>
      </div>

      {/* Decorative bottom border */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '10px',
          background:
            'linear-gradient(90deg, #F59E0B 0%, #FB923C 50%, #F59E0B 100%)',
        }}
      />

      {/* Website URL */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          fontSize: 18,
          color: '#9CA3AF',
        }}
      >
        madebuy.com.au
      </div>
    </div>,
    {
      ...size,
    },
  )
}
