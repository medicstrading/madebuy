'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#09090b' }}
    >
      <div className="text-center">
        <h1
          className="text-6xl font-bold"
          style={{ color: '#fafafa' }}
        >
          404
        </h1>
        <p
          className="mt-4 text-lg"
          style={{ color: '#a1a1aa' }}
        >
          Page not found
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
