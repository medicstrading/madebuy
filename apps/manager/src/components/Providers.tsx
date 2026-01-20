'use client'

import { SessionProvider } from 'next-auth/react'
import { type ReactNode, useState, useEffect } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR/static generation, render children without SessionProvider
  // This prevents context errors during prerendering
  if (!mounted) {
    return <>{children}</>
  }

  return <SessionProvider>{children}</SessionProvider>
}
