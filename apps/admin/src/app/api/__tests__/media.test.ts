import { media, pieces } from '@madebuy/db'
import { deleteFromR2, processImageWithVariants, uploadToR2 } from '@madebuy/storage'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Import handlers (mocks from setup.ts are already active)
import { GET as getMediaList } from '../media/route'
import { DELETE as deleteMedia } from '../media/[id]/route'
import { POST as bulkDelete } from '../media/bulk-delete/route'
import { POST as uploadMedia } from '../media/upload/route'

describe('GET /api/media', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockUnauthorized()

    const response = await getMediaList()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Please log in to continue.',
      code: 'UNAUTHORIZED',
    })
  })

  it('returns media list', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    vi.mocked(media.listMedia).mockResolvedValue([
      {
        id: 'media-1',
        tenantId: 'tenant-123',
        type: 'image',
        originalFilename: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        variants: {
          original: { url: 'https://r2.com/original.jpg', key: 'original.jpg' },
          thumbnail: { url: 'https://r2.com/thumb.jpg', key: 'thumb.jpg' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const response = await getMediaList()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      media: [{ id: 'media-1', originalFilename: 'test.jpg' }],
    })
    expect(media.listMedia).toHaveBeenCalledWith('tenant-123')
  })
})

describe('DELETE /api/media/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 500 when not authenticated', async () => {
    mockUnauthorized()
    const request = createRequest('/api/media/media-1', { method: 'DELETE' })

    const response = await deleteMedia(request, { params: { id: 'media-1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toMatchObject({
      error: 'Failed to delete media',
    })
  })

  it('returns 404 when media not found', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    vi.mocked(media.getMedia).mockResolvedValue(null)
    const request = createRequest('/api/media/media-999', { method: 'DELETE' })

    const response = await deleteMedia(request, { params: { id: 'media-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Media not found',
    })
  })

  it('deletes media and R2 files successfully', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    vi.mocked(media.getMedia).mockResolvedValue({
      id: 'media-1',
      tenantId: 'tenant-123',
      type: 'image',
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      variants: {
        original: { url: 'https://r2.com/original.jpg', key: 'original.jpg' },
        thumbnail: { url: 'https://r2.com/thumb.jpg', key: 'thumb.jpg' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(deleteFromR2).mockResolvedValue(undefined)
    vi.mocked(media.deleteMedia).mockResolvedValue(true)

    const request = createRequest('/api/media/media-1', { method: 'DELETE' })

    const response = await deleteMedia(request, { params: { id: 'media-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
    })
    expect(deleteFromR2).toHaveBeenCalledWith('original.jpg')
    expect(deleteFromR2).toHaveBeenCalledWith('thumb.jpg')
    expect(media.deleteMedia).toHaveBeenCalledWith('tenant-123', 'media-1')
  })
})

describe('POST /api/media/bulk-delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockUnauthorized()
    const request = createRequest('/api/media/bulk-delete', {
      method: 'POST',
      body: { mediaIds: ['media-1', 'media-2'] },
    })

    const response = await bulkDelete(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when mediaIds is missing', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    const request = createRequest('/api/media/bulk-delete', {
      method: 'POST',
      body: {},
    })

    const response = await bulkDelete(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'mediaIds array is required',
    })
  })

  it('returns 404 when some media items not found', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    vi.mocked(media.getMediaByIds).mockResolvedValue([
      {
        id: 'media-1',
        tenantId: 'tenant-123',
        type: 'image',
        originalFilename: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        variants: {
          original: { url: 'https://r2.com/original.jpg', key: 'original.jpg' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const request = createRequest('/api/media/bulk-delete', {
      method: 'POST',
      body: { mediaIds: ['media-1', 'media-2', 'media-3'] },
    })

    const response = await bulkDelete(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Media items not found')
  })

  it('deletes multiple media items successfully', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    vi.mocked(media.getMediaByIds).mockResolvedValue([
      {
        id: 'media-1',
        tenantId: 'tenant-123',
        type: 'image',
        originalFilename: 'test1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        variants: {
          original: { url: 'https://r2.com/original1.jpg', key: 'original1.jpg' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'media-2',
        tenantId: 'tenant-123',
        type: 'image',
        originalFilename: 'test2.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
        variants: {
          original: { url: 'https://r2.com/original2.jpg', key: 'original2.jpg' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    vi.mocked(media.deleteMediaBulk).mockResolvedValue(2)
    vi.mocked(deleteFromR2).mockResolvedValue(undefined)

    const request = createRequest('/api/media/bulk-delete', {
      method: 'POST',
      body: { mediaIds: ['media-1', 'media-2'] },
    })

    const response = await bulkDelete(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
      deletedCount: 2,
      message: 'Successfully deleted 2 media item(s)',
    })
    expect(media.deleteMediaBulk).toHaveBeenCalledWith('tenant-123', [
      'media-1',
      'media-2',
    ])
  })
})

describe('POST /api/media/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockUnauthorized()
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))

    const request = new NextRequest('http://localhost/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadMedia(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when file is missing', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    const formData = new FormData()

    const request = new NextRequest('http://localhost/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadMedia(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'File is required',
    })
  })

  it.skip('returns 400 when file is too large', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    const formData = new FormData()
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
    formData.append(
      'file',
      new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' }),
    )

    const request = new NextRequest('http://localhost/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadMedia(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('File too large')
  }, 10000)

  it.skip('returns 400 when file type is invalid', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))

    const request = new NextRequest('http://localhost/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadMedia(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'Invalid file type',
    })
  }, 10000)

  it.skip('uploads image successfully', async () => {
    mockCurrentTenant(MOCK_TENANT_FREE)
    const mockMediaItem = {
      id: 'media-new',
      tenantId: 'tenant-123',
      type: 'image' as const,
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      variants: {
        original: { url: 'https://r2.com/original.jpg', key: 'original.jpg' },
        thumbnail: { url: 'https://r2.com/thumb.jpg', key: 'thumb.jpg' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(processImageWithVariants).mockResolvedValue({
      original: { url: 'https://r2.com/original.jpg', key: 'original.jpg' },
      thumbnail: { url: 'https://r2.com/thumb.jpg', key: 'thumb.jpg' },
    })
    vi.mocked(media.createMedia).mockResolvedValue(mockMediaItem)
    vi.mocked(pieces.addMediaToPiece).mockResolvedValue(undefined)

    const formData = new FormData()
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]) // JPEG magic number
    formData.append(
      'file',
      new File([jpegBuffer], 'test.jpg', { type: 'image/jpeg' }),
    )
    formData.append('caption', 'Test caption')
    formData.append('pieceId', 'piece-1')

    const request = new NextRequest('http://localhost/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadMedia(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      media: { id: 'media-new' },
      id: 'media-new',
    })
    expect(processImageWithVariants).toHaveBeenCalled()
    expect(media.createMedia).toHaveBeenCalledWith('tenant-123', {
      type: 'image',
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: expect.any(Number),
      variants: expect.any(Object),
      caption: 'Test caption',
      pieceId: 'piece-1',
      processingStatus: undefined,
    })
    expect(pieces.addMediaToPiece).toHaveBeenCalledWith(
      'tenant-123',
      'piece-1',
      'media-new',
    )
  })
})
