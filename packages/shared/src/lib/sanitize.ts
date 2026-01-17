/**
 * HTML Sanitization Utilities
 * Provides XSS protection for user-generated HTML content
 */

// Allowed HTML tags for rich text content (newsletters, blog posts)
const ALLOWED_TAGS = new Set([
  // Text formatting
  'p',
  'br',
  'span',
  'div',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Lists
  'ul',
  'ol',
  'li',
  // Links and images
  'a',
  'img',
  // Tables
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  // Block elements
  'blockquote',
  'pre',
  'code',
  // Other
  'hr',
])

// Allowed URL protocols
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi, // onclick, onerror, etc.
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<!--[\s\S]*?-->/g, // HTML comments
]

/**
 * Sanitize HTML content to prevent XSS attacks
 * This is a basic sanitizer - for production use, consider using DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // Remove dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  // Remove disallowed tags (keep content)
  sanitized = sanitized.replace(
    /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    (match, tagName) => {
      const tag = tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        return '' // Remove the tag entirely
      }
      return match
    },
  )

  // Sanitize href and src attributes
  sanitized = sanitized.replace(
    /(href|src)\s*=\s*["']([^"']*)["']/gi,
    (match, attr, url) => {
      try {
        const parsed = new URL(url, 'https://example.com')
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
          return `${attr}="#"` // Replace with safe value
        }
      } catch {
        // Invalid URL, remove it
        return `${attr}="#"`
      }
      return match
    },
  )

  // Ensure links open safely
  sanitized = sanitized.replace(/<a\s/gi, '<a rel="noopener noreferrer" ')

  return sanitized.trim()
}

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
