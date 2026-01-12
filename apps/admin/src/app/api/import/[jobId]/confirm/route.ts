import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { imports, pieces, media } from '@madebuy/db'
import { getFromR2, uploadToR2 } from '@madebuy/storage'
import { parseCSV, validateAndParse } from '@/lib/csv-parser'
import type { ParsedRow, CreatePieceInput, ImportError } from '@madebuy/shared'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

/**
 * POST /api/import/[jobId]/confirm
 * Execute the import - create/update products from validated CSV
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    const job = await imports.getImportJob(tenant.id, jobId)

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 })
    }

    // Can only confirm validated jobs
    if (job.status !== 'validated') {
      return NextResponse.json(
        { error: `Cannot confirm job with status: ${job.status}. Must be validated first.` },
        { status: 400 }
      )
    }

    // Update status to processing
    await imports.updateImportJob(tenant.id, jobId, {
      status: 'processing',
      startedAt: new Date(),
    })

    // Fetch CSV from R2 (fileKey already contains the full path)
    const csvBuffer = await getFromR2(job.fileKey)
    if (!csvBuffer) {
      await imports.updateImportJob(tenant.id, jobId, {
        status: 'failed',
        errors: [...job.errors, { row: 0, message: 'Could not retrieve CSV file from storage' }],
      })
      return NextResponse.json(
        { error: 'Could not retrieve CSV file' },
        { status: 500 }
      )
    }

    const content = csvBuffer.toString('utf-8')
    const { headers, rows } = parseCSV(content)

    // Use saved column mapping
    const mapping = job.columnMapping || {}
    const result = validateAndParse(headers, rows, mapping)

    // Group rows by handle for multi-row products (images)
    const productsByHandle = new Map<string, ParsedRow[]>()
    for (const row of result.rows) {
      if (row.handle) {
        const existing = productsByHandle.get(row.handle) || []
        existing.push(row)
        productsByHandle.set(row.handle, existing)
      }
    }

    // Process each product
    const errors: ImportError[] = []
    let productsCreated = 0
    let productsUpdated = 0
    let productsSkipped = 0
    let imagesDownloaded = 0

    for (const [handle, productRows] of productsByHandle) {
      try {
        // Primary row has the product data
        const primaryRow = productRows.find(r => r.name) || productRows[0]
        if (!primaryRow?.name) {
          errors.push({
            row: primaryRow?.rowNumber || 0,
            message: `No name found for product with handle: ${handle}`,
          })
          productsSkipped++
          continue
        }

        // Check if product exists
        const existingPiece = await pieces.getPieceBySlug(tenant.id, handle)

        if (existingPiece && !job.updateExisting) {
          productsSkipped++
          continue
        }

        // Collect all image URLs
        const imageUrls: { url: string; position: number }[] = []
        for (const row of productRows) {
          if (row.imageUrl) {
            imageUrls.push({
              url: row.imageUrl,
              position: row.imagePosition || imageUrls.length + 1,
            })
          }
        }

        // Sort by position
        imageUrls.sort((a, b) => a.position - b.position)

        // Download and upload images
        const mediaIds: string[] = []
        for (const img of imageUrls) {
          try {
            const imageMedia = await downloadAndUploadImage(
              tenant.id,
              img.url,
              handle,
              img.position
            )
            if (imageMedia) {
              mediaIds.push(imageMedia.id)
              imagesDownloaded++
            }
          } catch (imgError) {
            console.error(`Failed to download image ${img.url}:`, imgError)
            // Continue without the image
          }
        }

        if (existingPiece) {
          // Update existing product
          await pieces.updatePiece(tenant.id, existingPiece.id, {
            name: primaryRow.name,
            description: primaryRow.description,
            price: primaryRow.price,
            stock: primaryRow.stock,
            category: primaryRow.category,
            tags: primaryRow.tags,
            status: (['draft', 'available', 'sold', 'reserved'].includes(primaryRow.status || '')
              ? primaryRow.status as 'draft' | 'available' | 'sold' | 'reserved'
              : existingPiece.status),
            // Add new media to existing
            mediaIds: [...existingPiece.mediaIds, ...mediaIds],
          })
          productsUpdated++
        } else {
          // Create new product
          const pieceData: CreatePieceInput = {
            name: primaryRow.name,
            description: primaryRow.description,
            price: primaryRow.price || 0,
            stock: primaryRow.stock,
            category: primaryRow.category || 'Uncategorized',
            tags: primaryRow.tags,
            status: (['draft', 'available', 'sold', 'reserved'].includes(primaryRow.status || '')
              ? primaryRow.status as 'draft' | 'available' | 'sold' | 'reserved'
              : 'draft'),
          }

          const newPiece = await pieces.createPiece(tenant.id, pieceData)

          // Update with custom slug and media
          await pieces.updatePiece(tenant.id, newPiece.id, {
            slug: handle,
            mediaIds,
          })

          productsCreated++
        }

        // Update progress periodically
        await imports.incrementImportCounts(tenant.id, jobId, {
          productsCreated: existingPiece ? 0 : 1,
          productsUpdated: existingPiece ? 1 : 0,
          imagesDownloaded: mediaIds.length,
        })
      } catch (productError) {
        const errorMessage = productError instanceof Error ? productError.message : 'Unknown error'
        errors.push({
          row: productRows[0]?.rowNumber || 0,
          message: `Failed to import product "${handle}": ${errorMessage}`,
        })

        if (!job.skipErrors) {
          // Stop on first error if skipErrors is false
          await imports.updateImportJob(tenant.id, jobId, {
            status: 'failed',
            completedAt: new Date(),
            productsCreated,
            productsUpdated,
            productsSkipped,
            imagesDownloaded,
            errors: [...job.errors, ...errors],
          })
          return NextResponse.json(
            { error: 'Import failed', errors },
            { status: 500 }
          )
        }

        productsSkipped++
      }
    }

    // Mark job as completed
    const finalJob = await imports.updateImportJob(tenant.id, jobId, {
      status: errors.length > 0 ? 'completed' : 'completed',
      completedAt: new Date(),
      productsCreated,
      productsUpdated,
      productsSkipped,
      imagesDownloaded,
      errors: [...job.errors, ...errors],
    })

    return NextResponse.json({
      success: true,
      job: finalJob,
      summary: {
        productsCreated,
        productsUpdated,
        productsSkipped,
        imagesDownloaded,
        errors: errors.length,
      },
    })
  } catch (error) {
    console.error('Error processing import:', error)

    const { jobId } = await params
    const tenant = await getCurrentTenant()
    if (tenant) {
      await imports.updateImportJob(tenant.id, jobId, {
        status: 'failed',
        completedAt: new Date(),
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Import failed' }],
      })
    }

    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    )
  }
}

/**
 * Download image from URL and upload to R2
 */
async function downloadAndUploadImage(
  tenantId: string,
  imageUrl: string,
  productHandle: string,
  position: number
): Promise<{ id: string } | null> {
  try {
    // Download image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'MadeBuy-Import/1.0',
      },
    })

    if (!response.ok) {
      console.error(`Failed to download image: ${response.status} ${response.statusText}`)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate filename
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const fileName = `imports/${productHandle}-${position}-${nanoid(6)}.${extension}`

    // Upload to R2
    const uploadResult = await uploadToR2({
      tenantId,
      fileName,
      buffer,
      contentType,
      metadata: {
        source: 'import',
        productHandle,
        position: String(position),
      },
    })

    // Create media record with proper variant structure
    const mediaRecord = await media.createMedia(tenantId, {
      type: 'image',
      mimeType: contentType,
      originalFilename: `${productHandle}-${position}.${extension}`,
      sizeBytes: buffer.length,
      variants: {
        original: {
          url: uploadResult.url,
          key: fileName,
          width: 0,
          height: 0,
          size: buffer.length,
        },
      },
      source: 'upload',
    })

    return { id: mediaRecord.id }
  } catch (error) {
    console.error(`Error downloading/uploading image from ${imageUrl}:`, error)
    return null
  }
}
