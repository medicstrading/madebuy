/**
 * HTML Sanitization Utilities
 *
 * IMPORTANT: This file contains sanitizeHtml which uses DOMPurify/jsdom.
 * For API routes and server components, use sanitize-input.ts instead
 * which has pure JS functions without external dependencies.
 */

import DOMPurify from 'isomorphic-dompurify'

// Re-export pure JS functions from sanitize-input
export { escapeHtml, sanitizeInput, stripHtml } from './sanitize-input'

/**
 * Sanitize HTML content to prevent XSS attacks using DOMPurify
 * DOMPurify is the industry-standard HTML sanitizer used by major platforms
 *
 * NOTE: Only import this in client components or pages that need HTML sanitization.
 * For API routes, use sanitizeInput from @madebuy/shared/lib/sanitize-input instead.
 *
 * @param html - HTML string to sanitize
 * @param config - Optional DOMPurify configuration
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(
  html: string,
  config?: {
    ALLOWED_TAGS?: string[]
    ALLOWED_ATTR?: string[]
    ALLOW_DATA_ATTR?: boolean
  },
): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Default allowed tags for rich text content (newsletters, blog posts, product descriptions)
  const defaultAllowedTags = [
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
  ]

  // Default allowed attributes
  const defaultAllowedAttrs = [
    'href',
    'src',
    'alt',
    'title',
    'class',
    'id',
    'target',
    'rel',
  ]

  // Merge user config with defaults
  const sanitizeConfig = {
    ALLOWED_TAGS: config?.ALLOWED_TAGS || defaultAllowedTags,
    ALLOWED_ATTR: config?.ALLOWED_ATTR || defaultAllowedAttrs,
    ALLOW_DATA_ATTR: config?.ALLOW_DATA_ATTR || false,
    // Security-critical settings
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    USE_PROFILES: { html: true },
    // Add rel="noopener noreferrer" to all links automatically
    ADD_ATTR: ['target'],
    // Only allow http, https, and mailto protocols
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  }

  const sanitized = DOMPurify.sanitize(html, sanitizeConfig)

  // Ensure all external links have proper security attributes
  return sanitized.replace(/<a\s/gi, '<a rel="noopener noreferrer" ')
}
