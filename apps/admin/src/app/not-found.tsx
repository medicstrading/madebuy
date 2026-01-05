// Force dynamic rendering to avoid useContext issues during static generation
// This is a known Next.js App Router issue where /_not-found prerendering fails with null React context
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>404</h1>
      <p style={{ marginTop: '1rem', color: '#4b5563' }}>Page not found</p>
      <a
        href="/login"
        style={{
          marginTop: '1.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#2563eb',
          color: 'white',
          borderRadius: '0.375rem',
          textDecoration: 'none'
        }}
      >
        Go to Login
      </a>
    </div>
  )
}
