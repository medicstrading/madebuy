'use client'

import { useEffect, useCallback } from 'react'

/**
 * Hook to warn users about unsaved changes when leaving the page.
 * Shows browser's native confirmation dialog when:
 * - Closing the tab/window
 * - Refreshing the page
 * - Navigating away (for external links)
 *
 * @param isDirty - Whether there are unsaved changes
 * @param message - Optional custom message (most browsers ignore custom messages)
 */
export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return

      // Standard way to trigger the browser's native "unsaved changes" dialog
      e.preventDefault()
      // For older browsers that respect returnValue
      e.returnValue = message || 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    },
    [isDirty, message]
  )

  useEffect(() => {
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty, handleBeforeUnload])
}
