/**
 * HTML Sanitization utilities
 * Re-exports from shared package for use in admin client components
 */

// Re-export sanitizeHtml from shared package (uses DOMPurify)
// This is safe for 'use client' components
export { sanitizeHtml } from '@madebuy/shared/lib/sanitize'

// Re-export pure JS functions (safe anywhere)
export { escapeHtml, sanitizeInput, stripHtml } from '@madebuy/shared/lib/sanitize-input'
