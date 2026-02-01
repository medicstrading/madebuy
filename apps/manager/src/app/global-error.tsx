'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{ margin: 0, backgroundColor: '#020617', minHeight: '100vh' }}
      >
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '3.75rem',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
              }}
            >
              Error
            </h1>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '1.125rem',
                color: '#94a3b8',
              }}
            >
              Something went wrong
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
