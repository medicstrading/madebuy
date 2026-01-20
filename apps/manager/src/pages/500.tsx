export default function Custom500() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: 0 }}>500</h1>
        <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginTop: '1rem' }}>
          Internal server error
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#6366f1',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none'
          }}
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
