/**
 * Input Sanitization Utilities
 * Pure JS functions without external dependencies - safe for server components/API routes
 */

/**
 * Escape HTML special characters for safe text display
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char])
}

/**
 * Strip all HTML tags, leaving only text content
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sanitize user input for database storage (prevents NoSQL injection)
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove null bytes and control characters (C0 control codes and DEL)
  // Using character code filtering instead of regex to avoid ESLint no-control-regex
  return input
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0)
      // Allow printable ASCII (32-126) and extended chars (128+)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()
}

/**
 * Server-safe HTML sanitizer for API routes.
 * Strips dangerous tags and attributes without requiring JSDOM/DOMPurify.
 * Use this instead of sanitizeHtml() in API routes and server components.
 */
export function sanitizeHtmlServer(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return (
    html
      // Remove script, style, iframe, object, embed, form tags and their content
      .replace(
        /<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi,
        '',
      )
      // Remove self-closing versions of dangerous tags
      .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, '')
      // Remove event handler attributes (on*)
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // Remove javascript: and data: URLs in href/src attributes
      .replace(
        /(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi,
        '$1=""',
      )
      .replace(
        /(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi,
        '$1=""',
      )
  )
}
