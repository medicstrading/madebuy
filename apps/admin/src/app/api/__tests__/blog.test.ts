import { blog } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
} from '../../../__tests__/setup'
import { getCurrentTenant } from '@/lib/session'

// Import handlers AFTER mocks
import { GET as listBlogPosts, POST as createBlogPost } from '../blog/route'
import {
  GET as getBlogPost,
  PATCH as updateBlogPost,
  DELETE as deleteBlogPost,
} from '../blog/[id]/route'

describe('GET /api/blog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = createRequest('/api/blog')

    const response = await listBlogPosts(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns blog posts list', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.listBlogPosts).mockResolvedValue([
      {
        id: 'post-1',
        tenantId: 'tenant-123',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>Content</p>',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const request = createRequest('/api/blog')

    const response = await listBlogPosts(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([
      {
        id: 'post-1',
        tenantId: 'tenant-123',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>Content</p>',
        status: 'published',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ])
    expect(blog.listBlogPosts).toHaveBeenCalledWith('tenant-123', {
      status: null,
      tags: undefined,
      limit: 50,
      offset: 0,
    })
  })

  it('filters by status and tags', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.listBlogPosts).mockResolvedValue([])

    const request = createRequest('/api/blog?status=draft&tags=tag1,tag2&limit=10&offset=5')

    await listBlogPosts(request)

    expect(blog.listBlogPosts).toHaveBeenCalledWith('tenant-123', {
      status: 'draft',
      tags: ['tag1', 'tag2'],
      limit: 10,
      offset: 5,
    })
  })
})

describe('POST /api/blog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = createRequest('/api/blog', {
      method: 'POST',
      body: { title: 'New Post', content: '<p>Content</p>' },
    })

    const response = await createBlogPost(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when title is missing', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/blog', {
      method: 'POST',
      body: { content: '<p>Content</p>' },
    })

    const response = await createBlogPost(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'Title and content are required',
    })
  })

  it('returns 400 when content is missing', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/blog', {
      method: 'POST',
      body: { title: 'New Post' },
    })

    const response = await createBlogPost(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'Title and content are required',
    })
  })

  it('creates blog post successfully', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    const newPost = {
      id: 'post-new',
      tenantId: 'tenant-123',
      title: 'New Post',
      slug: 'new-post',
      content: '<p>Content</p>',
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(blog.createBlogPost).mockResolvedValue(newPost)

    const request = createRequest('/api/blog', {
      method: 'POST',
      body: {
        title: 'New Post',
        content: '<p>Content</p>',
        excerpt: 'Excerpt',
        tags: ['tag1', 'tag2'],
        status: 'draft',
      },
    })

    const response = await createBlogPost(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      id: 'post-new',
      title: 'New Post',
    })
    expect(blog.createBlogPost).toHaveBeenCalledWith('tenant-123', {
      title: 'New Post',
      content: expect.any(String), // sanitized HTML
      excerpt: 'Excerpt',
      tags: ['tag1', 'tag2'],
      status: 'draft',
      coverImageId: undefined,
      metaTitle: undefined,
      metaDescription: undefined,
      publishRecordId: undefined,
    })
  })
})

describe('GET /api/blog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-1')

    const response = await getBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when blog post not found', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.getBlogPost).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-999')

    const response = await getBlogPost(request, { params: { id: 'post-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Blog post not found',
    })
  })

  it('returns blog post successfully', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.getBlogPost).mockResolvedValue({
      id: 'post-1',
      tenantId: 'tenant-123',
      title: 'Test Post',
      slug: 'test-post',
      content: '<p>Content</p>',
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const request = createRequest('/api/blog/post-1')

    const response = await getBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      id: 'post-1',
      title: 'Test Post',
    })
    expect(blog.getBlogPost).toHaveBeenCalledWith('tenant-123', 'post-1')
  })
})

describe('PATCH /api/blog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-1', {
      method: 'PATCH',
      body: { title: 'Updated' },
    })

    const response = await updateBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when blog post not found', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.updateBlogPost).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-999', {
      method: 'PATCH',
      body: { title: 'Updated' },
    })

    const response = await updateBlogPost(request, { params: { id: 'post-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Blog post not found',
    })
  })

  it('returns 409 on slug conflict', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.updateBlogPost).mockRejectedValue(
      new Error('Slug already exists'),
    )
    const request = createRequest('/api/blog/post-1', {
      method: 'PATCH',
      body: { slug: 'existing-slug' },
    })

    const response = await updateBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('Slug already exists')
  })

  it('updates blog post successfully', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    const updatedPost = {
      id: 'post-1',
      tenantId: 'tenant-123',
      title: 'Updated Post',
      slug: 'updated-post',
      content: '<p>Updated Content</p>',
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(blog.updateBlogPost).mockResolvedValue(updatedPost)

    const request = createRequest('/api/blog/post-1', {
      method: 'PATCH',
      body: { title: 'Updated Post', status: 'published' },
    })

    const response = await updateBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      id: 'post-1',
      title: 'Updated Post',
    })
    expect(blog.updateBlogPost).toHaveBeenCalledWith('tenant-123', 'post-1', {
      title: 'Updated Post',
      slug: undefined,
      content: undefined,
      excerpt: undefined,
      coverImageId: undefined,
      tags: undefined,
      metaTitle: undefined,
      metaDescription: undefined,
      status: 'published',
    })
  })
})

describe('DELETE /api/blog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-1', { method: 'DELETE' })

    const response = await deleteBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when blog post not found', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.getBlogPost).mockResolvedValue(null)
    const request = createRequest('/api/blog/post-999', { method: 'DELETE' })

    const response = await deleteBlogPost(request, { params: { id: 'post-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Blog post not found',
    })
  })

  it('deletes blog post successfully', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(blog.getBlogPost).mockResolvedValue({
      id: 'post-1',
      tenantId: 'tenant-123',
      title: 'Test Post',
      slug: 'test-post',
      content: '<p>Content</p>',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(blog.deleteBlogPost).mockResolvedValue(true)

    const request = createRequest('/api/blog/post-1', { method: 'DELETE' })

    const response = await deleteBlogPost(request, { params: { id: 'post-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
    })
    expect(blog.deleteBlogPost).toHaveBeenCalledWith('tenant-123', 'post-1')
  })
})
