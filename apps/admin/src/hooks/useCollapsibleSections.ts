'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for managing collapsible sections with localStorage persistence
 *
 * @param storageKey - Key for localStorage persistence
 * @param defaultCollapsed - Array of section IDs that should be collapsed by default
 * @returns Object with isCollapsed check and toggle function
 */
export function useCollapsibleSections(
  storageKey: string,
  defaultCollapsed: string[] = [],
) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(defaultCollapsed),
  )
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCollapsed(new Set(parsed))
        }
      }
    } catch (_e) {
      // Ignore localStorage errors
    }
    setIsHydrated(true)
  }, [storageKey])

  // Save to localStorage when collapsed state changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...collapsed]))
      } catch (_e) {
        // Ignore localStorage errors
      }
    }
  }, [collapsed, storageKey, isHydrated])

  const toggle = useCallback((section: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const isCollapsed = useCallback(
    (section: string) => collapsed.has(section),
    [collapsed],
  )

  const setCollapsedState = useCallback(
    (section: string, isCollapsed: boolean) => {
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (isCollapsed) {
          next.add(section)
        } else {
          next.delete(section)
        }
        return next
      })
    },
    [],
  )

  return { isCollapsed, toggle, setCollapsed: setCollapsedState }
}
