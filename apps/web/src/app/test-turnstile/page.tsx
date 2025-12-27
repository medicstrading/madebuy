'use client'

import { useState } from 'react'
import { TurnstileChallenge } from '@/components/marketplace'

/**
 * Test page for Turnstile integration
 * Visit: http://localhost:3302/test-turnstile
 */
export default function TestTurnstilePage() {
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async (token: string) => {
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/marketplace/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        setVerified(true)
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Turnstile Integration Test
        </h1>

        {/* Configuration Status */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Configuration Check
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== 'your_site_key_here'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-gray-700">
                NEXT_PUBLIC_TURNSTILE_SITE_KEY:{' '}
                <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.substring(0, 20)}...
                </code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gray-300" />
              <span className="text-gray-700">
                TURNSTILE_SECRET_KEY: <span className="text-gray-500">(server-side only)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Test Area */}
        {!verified && !verifying && (
          <div className="rounded-lg border border-gray-200 bg-white p-8">
            <TurnstileChallenge onVerify={handleVerify} onError={() => setError('Challenge failed')} />
          </div>
        )}

        {verifying && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
            <div className="mb-2 text-lg font-semibold text-blue-900">Verifying...</div>
            <p className="text-sm text-blue-700">Checking with Cloudflare servers</p>
          </div>
        )}

        {verified && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
            <div className="mb-2 text-2xl">✅</div>
            <div className="mb-2 text-lg font-semibold text-green-900">
              Verification Successful!
            </div>
            <p className="text-sm text-green-700">
              Turnstile is configured correctly and working.
            </p>
            <button
              onClick={() => {
                setVerified(false)
                setError(null)
              }}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Test Again
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="font-semibold text-red-900">Error:</div>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-3 font-semibold text-blue-900">Setup Instructions:</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-blue-800">
            <li>Get your keys from Cloudflare Turnstile dashboard</li>
            <li>
              Replace placeholders in <code className="rounded bg-blue-100 px-1">.env.local</code>
            </li>
            <li>Restart the dev server: <code className="rounded bg-blue-100 px-1">pnpm dev</code></li>
            <li>Refresh this page and complete the challenge</li>
            <li>If green checkmark appears, you&apos;re ready to go! 🎉</li>
          </ol>
        </div>

        {/* Next Steps */}
        {verified && (
          <div className="mt-8 rounded-lg border border-purple-200 bg-purple-50 p-6">
            <h3 className="mb-3 font-semibold text-purple-900">✨ Next Steps:</h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• Turnstile is now protecting your product pages</li>
              <li>• Enable Cloudflare Hotlink Protection (2 min)</li>
              <li>• Update media upload endpoints to use protected upload</li>
              <li>• Test the full marketplace flow</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
