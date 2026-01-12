/**
 * HTML Sanitization utilities
 * Prevents XSS attacks when rendering user-controlled HTML content
 *
 * Note: Uses simple regex-based sanitization to avoid JSDOM build issues
 */

/**
 * Sanitize HTML content for safe rendering via dangerouslySetInnerHTML
 * Removes potentially dangerous scripts, event handlers, and other XSS vectors
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return ''

  // Simple regex-based sanitization
  // This is a basic approach that removes script tags and dangerous attributes
  let cleaned = html

  // Remove script tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove on* event handlers
  cleaned = cleaned.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/\son\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '')

  // Remove data: protocol (can be used for XSS)
  cleaned = cleaned.replace(/data:text\/html/gi, '')

  return cleaned
}

/**
 * Strip all HTML tags, returning plain text only
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}
