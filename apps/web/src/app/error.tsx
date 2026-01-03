'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1rem',
        }}>
          500
        </h1>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem',
        }}>
          Something went wrong
        </h2>
        <p style={{
          color: '#4b5563',
          marginBottom: '2rem',
        }}>
          We&apos;re sorry, an unexpected error occurred.
        </p>
        <button
          onClick={reset}
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            marginRight: '1rem',
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#e5e7eb',
            color: '#374151',
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
