'use client'

import { useEffect } from 'react'

export function AutoPrint() {
  useEffect(() => {
    // Auto-open print dialog when page loads
    const timer = setTimeout(() => {
      window.print()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return null
}
