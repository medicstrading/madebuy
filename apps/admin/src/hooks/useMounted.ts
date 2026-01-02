'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if component has mounted (client-side only).
 * Use this to prevent hydration mismatches when using browser-only values
 * like dates, localStorage, window dimensions, etc.
 *
 * @example
 * const mounted = useMounted()
 * const currentYear = mounted ? new Date().getFullYear() : null
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
