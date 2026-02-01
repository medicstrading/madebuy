import { useEffect, useRef } from 'react'

/**
 * Hook to trap focus within a container element (modal, dialog, etc.)
 * Implements WCAG 2.1 focus management requirements
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    // Store the element that had focus before the trap was activated
    previousFocusRef.current = document.activeElement as HTMLElement

    // Get all focusable elements in the container
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ]

      return Array.from(
        container.querySelectorAll<HTMLElement>(selectors.join(',')),
      ).filter((el) => {
        // Filter out elements that are not visible
        return el.offsetParent !== null
      })
    }

    // Focus first focusable element when trap activates
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Cleanup: restore focus to previous element
    return () => {
      container.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the element that had it before the trap
      if (
        previousFocusRef.current &&
        document.body.contains(previousFocusRef.current)
      ) {
        previousFocusRef.current.focus()
      }
    }
  }, [isActive])

  return containerRef
}
