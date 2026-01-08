'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function UnsubscribePage({
  params: { tenant },
}: {
  params: { tenant: string }
}) {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email')
  const token = searchParams?.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    // Validate required params
    if (!email || !token) {
      setStatus('invalid')
      return
    }

    // Process unsubscribe
    processUnsubscribe()
  }, [email, token])

  const processUnsubscribe = async () => {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, tenant }),
      })

      if (response.ok) {
        setStatus('success')
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Failed to unsubscribe')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Processing...</h1>
            <p className="mt-2 text-gray-600">Please wait while we process your request.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Successfully Unsubscribed</h1>
            <p className="mt-2 text-gray-600">
              You have been removed from our mailing list. You will no longer receive marketing emails from us.
            </p>
            {email && (
              <p className="mt-4 text-sm text-gray-500">
                Unsubscribed: <span className="font-medium">{email}</span>
              </p>
            )}
            <Link
              href={`/${tenant}`}
              className="mt-6 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Return to Shop
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Unable to Unsubscribe</h1>
            <p className="mt-2 text-gray-600">{errorMessage}</p>
            <p className="mt-4 text-sm text-gray-500">
              Please contact support if you continue to have issues.
            </p>
            <Link
              href={`/${tenant}`}
              className="mt-6 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Return to Shop
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Mail className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Invalid Link</h1>
            <p className="mt-2 text-gray-600">
              The unsubscribe link is missing required information. Please use the link from your email.
            </p>
            <Link
              href={`/${tenant}`}
              className="mt-6 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Return to Shop
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
