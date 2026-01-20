'use client'

import { SessionProvider } from 'next-auth/react'
import { type ReactNode, useState, useEffect } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During static generation or initial server render, just render children
  // without SessionProvider to avoid context issues
  if (!mounted) {
    return <>{children}</>
  }

  return <SessionProvider>{children}</SessionProvider>
}
