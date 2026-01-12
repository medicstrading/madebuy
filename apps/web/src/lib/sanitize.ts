/**
 * HTML Sanitization utilities
 * Prevents XSS attacks when rendering user-controlled HTML content
 */
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content for safe rendering via dangerouslySetInnerHTML
 * Removes potentially dangerous scripts, event handlers, and other XSS vectors
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    // Allow common formatting tags
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'span', 'div',
      'blockquote', 'pre', 'code',
    ],
    // Allow safe attributes only
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    // Force safe link targets
    ADD_ATTR: ['target', 'rel'],
    // Hook to ensure all links are safe
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
    // Only allow safe protocols for links
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/**
 * Strip all HTML tags, returning plain text only
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
}
