/**
 * HTML Sanitization utilities
 * Prevents XSS attacks when rendering user-controlled HTML content
 *
 * Uses DOMPurify for robust HTML sanitization
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content for safe rendering via dangerouslySetInnerHTML
 * Removes potentially dangerous scripts, event handlers, and other XSS vectors
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return ''

  // Use DOMPurify with strict config
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  })
}

/**
 * Strip all HTML tags, returning plain text only
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}
