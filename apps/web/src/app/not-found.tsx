// Explicitly prevent static prerendering of the not-found page
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem',
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem',
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            color: '#4b5563',
            marginBottom: '2rem',
          }}
        >
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
