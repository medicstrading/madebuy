import type { InvoiceLineItem, MaterialUnit } from '@madebuy/shared'

/**
 * Normalize unit strings to MaterialUnit type
 */
function normalizeUnit(unitStr: string): MaterialUnit | undefined {
  const normalized = unitStr.toLowerCase().trim()

  // Gram variations
  if (normalized.match(/^g(ram|rams)?$/)) return 'gram'

  // Kilogram variations
  if (normalized.match(/^kg|kgs|kilogram|kilograms$/)) return 'kg'

  // Meter variations
  if (normalized.match(/^m|meter|meters|metre|metres$/)) return 'meter'

  // Piece variations
  if (normalized.match(/^pc|pcs|piece|pieces|unit|units|ea|each$/))
    return 'piece'

  // Set variations
  if (normalized.match(/^set|sets$/)) return 'set'

  // Milliliter variations
  if (normalized.match(/^ml|milliliter|milliliters|millilitre|millilitres$/))
    return 'ml'

  return undefined
}

/**
 * Calculate confidence score based on extracted fields
 */
function calculateConfidence(data: {
  price?: number
  quantity?: number
  name?: string
}): number {
  let score = 0

  // Name present: +40 points
  if (data.name && data.name.length > 2) {
    score += 40
  }

  // Price present: +30 points
  if (data.price !== undefined && data.price > 0) {
    score += 30
  }

  // Quantity present: +30 points
  if (data.quantity !== undefined && data.quantity > 0) {
    score += 30
  }

  return Math.min(score, 100)
}

/**
 * Parse a single line of invoice text into structured data
 */
export function parseLineItem(text: string): InvoiceLineItem {
  // Extract price: $85.00, 85.00, $85, etc.
  const priceMatch = text.match(/\$?\s*(\d+[,.]?\d*\.?\d*)/g)
  const prices =
    priceMatch?.map((p) => parseFloat(p.replace(/[$,\s]/g, ''))) || []
  const price = prices.find((p) => p > 0) // Get first valid price

  // Extract quantity + unit: "100g", "50 meter", "25 piece", "1.5kg", etc.
  const qtyUnitMatch = text.match(
    /(\d+\.?\d*)\s*(g|gram|kg|m|meter|pc|piece|set|ml|ea|each|unit)/i,
  )
  const quantity = qtyUnitMatch ? parseFloat(qtyUnitMatch[1]) : undefined
  const unitStr = qtyUnitMatch ? qtyUnitMatch[2] : undefined
  const unit = unitStr ? normalizeUnit(unitStr) : undefined

  // Extract name: remaining text after removing numbers, prices, and units
  let name = text
    // Remove prices
    .replace(/\$?\s*\d+[,.]?\d*\.?\d*/g, '')
    // Remove quantity+unit patterns
    .replace(
      /\d+\.?\d*\s*(g|gram|kg|m|meter|pc|piece|set|ml|ea|each|unit)/gi,
      '',
    )
    // Remove common noise
    .replace(/[-|]/g, ' ')
    .trim()

  // Clean up name
  name = name.split(/\s{2,}/).join(' ') // Collapse multiple spaces
  const parsedName = name.length > 2 ? name : undefined

  return {
    extractedText: text,
    parsedName,
    parsedPrice: price,
    parsedQuantity: quantity,
    parsedUnit: unit,
    confidence: calculateConfidence({ price, quantity, name: parsedName }),
  }
}

/**
 * Parse all invoice lines into structured line items
 * Filters out low-confidence lines and headers
 */
export function parseInvoiceLines(lines: string[]): InvoiceLineItem[] {
  const lineItems: InvoiceLineItem[] = []

  // Common invoice header patterns to skip
  const headerPatterns = [
    /^invoice/i,
    /^bill to/i,
    /^ship to/i,
    /^date/i,
    /^total/i,
    /^subtotal/i,
    /^tax/i,
    /^amount/i,
    /^description/i,
    /^qty/i,
    /^price/i,
    /^page \d+/i,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // Dates
  ]

  for (const line of lines) {
    // Skip empty lines
    if (!line || line.trim().length === 0) continue

    // Skip header lines
    if (headerPatterns.some((pattern) => pattern.test(line))) continue

    // Skip lines with only numbers or symbols
    if (/^[\d\s\-.$,]+$/.test(line)) continue

    // Parse line
    const item = parseLineItem(line)

    // Only include items with reasonable confidence (at least have a name OR price+quantity)
    if (item.confidence !== undefined && item.confidence >= 30) {
      lineItems.push(item)
    }
  }

  return lineItems
}

/**
 * Extract supplier name from invoice lines (best effort)
 */
export function extractSupplier(lines: string[]): string | undefined {
  // Look for common supplier indicators in first 10 lines
  const topLines = lines.slice(0, 10)

  for (const line of topLines) {
    // Skip very short lines
    if (line.length < 3) continue

    // Look for patterns like "From:", "Supplier:", company name followed by address indicators
    if (line.match(/^(from|supplier|vendor):/i)) {
      const supplierName = line.replace(/^(from|supplier|vendor):/i, '').trim()
      if (supplierName.length > 0) return supplierName
    }

    // Look for lines with business indicators (Pty Ltd, LLC, Inc, etc)
    if (line.match(/(pty\s+ltd|llc|inc|incorporated|limited|corp)/i)) {
      return line.trim()
    }
  }

  return undefined
}

/**
 * Extract total amount from invoice lines
 */
export function extractTotalAmount(lines: string[]): number | undefined {
  // Look for total in last 10 lines (usually at bottom)
  const bottomLines = lines.slice(-10)

  for (const line of bottomLines) {
    // Look for "Total", "Grand Total", "Amount Due" etc
    if (line.match(/^(total|grand total|amount due|balance|total amount):/i)) {
      const amountMatch = line.match(/\$?\s*(\d+[,.]?\d*\.?\d*)/)
      if (amountMatch) {
        return parseFloat(amountMatch[1].replace(/[,$]/g, ''))
      }
    }

    // Also check for common total patterns like "Total: $250.00" or "TOTAL 250.00"
    const totalMatch = line.match(
      /(total|grand total|amount due)[:\s]+\$?\s*(\d+[,.]?\d*\.?\d*)/i,
    )
    if (totalMatch) {
      return parseFloat(totalMatch[2].replace(/[,$]/g, ''))
    }
  }

  return undefined
}

/**
 * Extract invoice date (best effort)
 */
export function extractInvoiceDate(lines: string[]): Date | undefined {
  // Look for date patterns in first 15 lines
  const topLines = lines.slice(0, 15)

  for (const line of topLines) {
    // Common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/, // YYYY-MM-DD
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i, // Month DD, YYYY
    ]

    for (const pattern of datePatterns) {
      const match = line.match(pattern)
      if (match) {
        try {
          const date = new Date(match[1])
          if (!Number.isNaN(date.getTime())) {
            return date
          }
        } catch {
          // Invalid date, continue
        }
      }
    }
  }

  return undefined
}
