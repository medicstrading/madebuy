/**
 * CSV Parser for MadeBuy Import
 * Supports parsing CSV files with various formats (Shopify, Etsy, WooCommerce, MadeBuy)
 */

import type {
  ColumnMapping,
  ImportError,
  ImportPreview,
  ImportSource,
  ImportWarning,
  ParsedRow,
} from '@madebuy/shared'

interface ParseResult {
  rows: ParsedRow[]
  errors: ImportError[]
  warnings: ImportWarning[]
  detectedSource: ImportSource
  detectedColumns: string[]
  suggestedMapping: ColumnMapping
}

/**
 * Parse CSV content into structured rows
 */
export function parseCSV(content: string): {
  headers: string[]
  rows: string[][]
} {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(parseCSVLine)

  return { headers, rows }
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * Detect the source platform from column headers
 */
export function detectSource(headers: string[]): ImportSource {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Shopify format detection
  if (
    (normalizedHeaders.includes('handle') &&
      normalizedHeaders.includes('body (html)')) ||
    normalizedHeaders.includes('variant sku')
  ) {
    return 'shopify'
  }

  // WooCommerce format detection
  if (
    normalizedHeaders.includes('sku') &&
    normalizedHeaders.includes('name') &&
    normalizedHeaders.includes('regular price')
  ) {
    return 'woocommerce'
  }

  // Etsy format detection
  if (
    (normalizedHeaders.includes('title') &&
      normalizedHeaders.includes('listing_id')) ||
    normalizedHeaders.includes('quantity')
  ) {
    return 'etsy'
  }

  // MadeBuy format detection
  if (
    normalizedHeaders.includes('handle') &&
    normalizedHeaders.includes('name')
  ) {
    return 'madebuy'
  }

  return 'custom'
}

/**
 * Suggest column mapping based on detected source and headers
 */
export function suggestColumnMapping(
  headers: string[],
  source: ImportSource,
): ColumnMapping {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Platform-specific mappings
  const mappings: Record<ImportSource, Record<string, string>> = {
    madebuy: {
      handle: 'handle',
      name: 'name',
      description: 'description',
      price: 'price',
      stock: 'stock',
      category: 'category',
      tags: 'tags',
      status: 'status',
      sku: 'sku',
      imageUrl: 'imagesrc',
      imagePosition: 'imageposition',
    },
    shopify: {
      handle: 'handle',
      name: 'title',
      description: 'body (html)',
      price: 'variant price',
      stock: 'variant inventory qty',
      category: 'type',
      tags: 'tags',
      status: 'status',
      sku: 'variant sku',
      imageUrl: 'image src',
      imagePosition: 'image position',
    },
    woocommerce: {
      handle: 'sku',
      name: 'name',
      description: 'description',
      price: 'regular price',
      stock: 'stock',
      category: 'categories',
      tags: 'tags',
      status: 'published',
      sku: 'sku',
      imageUrl: 'images',
    },
    etsy: {
      handle: 'listing_id',
      name: 'title',
      description: 'description',
      price: 'price',
      stock: 'quantity',
      category: 'category',
      tags: 'tags',
    },
    custom: {},
  }

  const platformMapping = mappings[source]
  const result: ColumnMapping = {}

  for (const [field, expectedColumn] of Object.entries(platformMapping)) {
    const index = normalizedHeaders.indexOf(expectedColumn)
    if (index !== -1) {
      ;(result as Record<string, string>)[field] = headers[index]
    }
  }

  return result
}

/**
 * Validate and parse CSV rows
 */
export function validateAndParse(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
): ParseResult {
  const parsedRows: ParsedRow[] = []
  const errors: ImportError[] = []
  const warnings: ImportWarning[] = []

  // Create header index lookup
  const headerIndex: Record<string, number> = {}
  headers.forEach((h, i) => {
    headerIndex[h] = i
  })

  // Get column indices from mapping
  const getColumnIndex = (field: keyof ColumnMapping): number | undefined => {
    const columnName = mapping[field]
    if (!columnName) return undefined
    return headerIndex[columnName]
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 2 // Account for header row and 0-indexing

    // Skip empty rows
    if (row.every((cell) => !cell.trim())) {
      continue
    }

    // Build raw object
    const raw: Record<string, string> = {}
    headers.forEach((h, idx) => {
      raw[h] = row[idx] || ''
    })

    // Get value helper
    const getValue = (field: keyof ColumnMapping): string | undefined => {
      const idx = getColumnIndex(field)
      return idx !== undefined ? row[idx]?.trim() : undefined
    }

    // Parse handle
    const handle = getValue('handle')
    if (!handle) {
      errors.push({
        row: rowNumber,
        column: mapping.handle || 'handle',
        message: 'Handle/slug is required',
      })
      continue
    }

    // Parse name (required unless this is an image row)
    const name = getValue('name')
    const imageUrl = getValue('imageUrl')

    // If no name but has imageUrl, this might be an additional image row
    if (!name && imageUrl) {
      // Check if we have a previous row with the same handle
      const parentRow = parsedRows.find((r) => r.handle === handle)
      if (parentRow) {
        // This is an additional image row, skip for now
        // Images will be collected during import
        continue
      }
    }

    if (!name && !imageUrl) {
      errors.push({
        row: rowNumber,
        column: mapping.name || 'name',
        message: 'Product name is required',
      })
      continue
    }

    // Parse price
    let price: number | undefined
    const priceStr = getValue('price')
    if (priceStr) {
      const parsed = parseFloat(priceStr.replace(/[$,]/g, ''))
      if (Number.isNaN(parsed)) {
        errors.push({
          row: rowNumber,
          column: mapping.price || 'price',
          message: `Invalid price: "${priceStr}"`,
          value: priceStr,
        })
      } else if (parsed < 0) {
        errors.push({
          row: rowNumber,
          column: mapping.price || 'price',
          message: 'Price cannot be negative',
          value: priceStr,
        })
      } else {
        price = parsed
      }
    }

    // Parse stock
    let stock: number | undefined
    const stockStr = getValue('stock')
    if (stockStr) {
      const parsed = parseInt(stockStr, 10)
      if (Number.isNaN(parsed)) {
        warnings.push({
          row: rowNumber,
          column: mapping.stock || 'stock',
          message: `Invalid stock value: "${stockStr}", will be set to unlimited`,
        })
      } else if (parsed < 0) {
        warnings.push({
          row: rowNumber,
          column: mapping.stock || 'stock',
          message: 'Stock cannot be negative, will be set to 0',
        })
        stock = 0
      } else {
        stock = parsed
      }
    }

    // Parse tags
    let tags: string[] | undefined
    const tagsStr = getValue('tags')
    if (tagsStr) {
      tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }

    // Parse status
    let status = getValue('status')?.toLowerCase()
    const validStatuses = ['draft', 'available', 'sold', 'reserved', 'archived']
    if (status && !validStatuses.includes(status)) {
      warnings.push({
        row: rowNumber,
        column: mapping.status || 'status',
        message: `Invalid status "${status}", will be set to "draft"`,
      })
      status = 'draft'
    }

    // Parse image position
    let imagePosition: number | undefined
    const posStr = getValue('imagePosition')
    if (posStr) {
      const parsed = parseInt(posStr, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        imagePosition = parsed
      }
    }

    // Create parsed row
    const parsedRow: ParsedRow = {
      rowNumber,
      handle,
      name,
      description: getValue('description'),
      price,
      currency: 'AUD',
      stock,
      category: getValue('category'),
      tags,
      status: status || 'draft',
      sku: getValue('sku'),
      imageUrl,
      imagePosition,
      raw,
    }

    parsedRows.push(parsedRow)
  }

  const source = detectSource(headers)

  return {
    rows: parsedRows,
    errors,
    warnings,
    detectedSource: source,
    detectedColumns: headers,
    suggestedMapping: suggestColumnMapping(headers, source),
  }
}

/**
 * Generate import preview from parsed rows
 */
export function generatePreview(result: ParseResult): ImportPreview {
  // Group rows by handle to count products
  const productsByHandle = new Map<string, ParsedRow[]>()
  for (const row of result.rows) {
    if (row.handle) {
      const existing = productsByHandle.get(row.handle) || []
      existing.push(row)
      productsByHandle.set(row.handle, existing)
    }
  }

  // Count products and images
  let productsDetected = 0
  let imagesDetected = 0

  for (const rows of productsByHandle.values()) {
    productsDetected++
    imagesDetected += rows.filter((r) => r.imageUrl).length
  }

  return {
    totalRows: result.rows.length,
    productsDetected,
    variantsDetected: 0, // Phase 2 feature
    imagesDetected,
    detectedSource: result.detectedSource,
    sampleRows: result.rows.slice(0, 5),
    detectedColumns: result.detectedColumns,
    suggestedMapping: result.suggestedMapping,
  }
}

/**
 * Generate a blank CSV template
 */
export function generateTemplate(): string {
  const headers = [
    'handle',
    'name',
    'description',
    'price',
    'stock',
    'category',
    'tags',
    'status',
    'imageSrc',
    'imagePosition',
  ]

  const exampleRow = [
    'example-product',
    'Example Product Name',
    'A detailed description of your product',
    '29.99',
    '10',
    'Ceramics',
    'handmade, ceramic, mug',
    'available',
    'https://example.com/image.jpg',
    '1',
  ]

  return [headers.join(','), exampleRow.join(',')].join('\n')
}
