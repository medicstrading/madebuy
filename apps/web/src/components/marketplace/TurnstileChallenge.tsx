'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useState } from 'react'

interface TurnstileChallengeProps {
  onVerify: (token: string) => void
  onError?: () => void
}

/**
 * Cloudflare Turnstile bot detection challenge
 * Free, unlimited, no CAPTCHA required
 */
export function TurnstileChallenge({ onVerify, onError }: TurnstileChallengeProps) {
  const [isVerifying, setIsVerifying] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">Verify you&apos;re human</h3>
        <p className="mt-1 text-sm text-gray-600">
          This helps us protect makers&apos; products from automated scraping
        </p>
      </div>

      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || 'test-key'}
        onSuccess={(token) => {
          setIsVerifying(true)
          onVerify(token)
        }}
        onError={() => {
          onError?.()
        }}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />

      {isVerifying && (
        <div className="mt-4 text-sm text-gray-600">
          Verifying...
        </div>
      )}
    </div>
  )
}
