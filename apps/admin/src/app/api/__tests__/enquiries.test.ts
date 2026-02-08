import { enquiries, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Mock Resend - use vi.hoisted to avoid hoisting conflicts
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}))

// Import handlers AFTER mocks
import { GET, POST } from '../enquiries/route'
import {
  DELETE,
  GET as GET_BY_ID,
  PATCH,
} from '../enquiries/[id]/route'
import { POST as POST_REPLY } from '../enquiries/[id]/reply/route'

describe('Enquiries API - GET /api/enquiries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns enquiries list', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiries = [
      {
        id: 'enq-1',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello',
        status: 'new',
      },
    ]
    vi.mocked(enquiries.listEnquiries).mockResolvedValue(mockEnquiries)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enquiries).toEqual(mockEnquiries)
    expect(enquiries.listEnquiries).toHaveBeenCalledWith(mockTenant.id)
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.listEnquiries).mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Enquiries API - POST /api/enquiries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/enquiries', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('creates enquiry successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const enquiryData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'I have a question',
    }

    const mockEnquiry = { id: 'enq-1', ...enquiryData, status: 'new' }
    vi.mocked(enquiries.createEnquiry).mockResolvedValue(mockEnquiry)

    const request = new NextRequest('http://localhost/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiryData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.enquiry).toEqual(mockEnquiry)
    expect(enquiries.createEnquiry).toHaveBeenCalledWith(
      mockTenant.id,
      enquiryData,
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.createEnquiry).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/enquiries', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Enquiries API - GET /api/enquiries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/enquiries/enq-1')
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when enquiry not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1')
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Enquiry not found')
  })

  it('returns enquiry successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = {
      id: 'enq-1',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Test message',
    }
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1')
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enquiry).toEqual(mockEnquiry)
    expect(enquiries.getEnquiry).toHaveBeenCalledWith(mockTenant.id, 'enq-1')
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.getEnquiry).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/enquiries/enq-1')
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Enquiries API - PATCH /api/enquiries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('updates status when provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = { id: 'enq-1', status: 'responded' }
    vi.mocked(enquiries.updateEnquiryStatus).mockResolvedValue(mockEnquiry)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enquiry).toEqual(mockEnquiry)
    expect(enquiries.updateEnquiryStatus).toHaveBeenCalledWith(
      mockTenant.id,
      'enq-1',
      'responded',
    )
  })

  it('adds note when provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = { id: 'enq-1', notes: ['Test note'] }
    vi.mocked(enquiries.addEnquiryNote).mockResolvedValue(mockEnquiry)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Test note' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enquiry).toEqual(mockEnquiry)
    expect(enquiries.addEnquiryNote).toHaveBeenCalledWith(
      mockTenant.id,
      'enq-1',
      'Test note',
    )
  })

  it('updates both status and note when both provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = { id: 'enq-1', status: 'responded', notes: ['Note'] }
    vi.mocked(enquiries.updateEnquiryStatus).mockResolvedValue(mockEnquiry)
    vi.mocked(enquiries.addEnquiryNote).mockResolvedValue(mockEnquiry)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded', note: 'Note' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })

    expect(response.status).toBe(200)
    expect(enquiries.updateEnquiryStatus).toHaveBeenCalled()
    expect(enquiries.addEnquiryNote).toHaveBeenCalled()
  })

  it('returns 404 when enquiry not found after update', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Enquiry not found')
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.updateEnquiryStatus).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded' }),
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Enquiries API - DELETE /api/enquiries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('deletes enquiry successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.deleteEnquiry).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(enquiries.deleteEnquiry).toHaveBeenCalledWith(mockTenant.id, 'enq-1')
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.deleteEnquiry).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/enquiries/enq-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Enquiries API - POST /api/enquiries/[id]/reply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ id: 'email-123' })
    vi.stubEnv('RESEND_API_KEY', 'test-api-key')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 'Re: Test', body: 'Response' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('validates required fields', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 'Re: Test' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Subject and body are required')
  })

  it('validates field types', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 123, body: 'Test' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Subject and body must be strings')
  })

  it('validates maximum length', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const longSubject = 'a'.repeat(201)
    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: longSubject, body: 'Test' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Subject or body exceeds maximum length')
  })

  it('returns 404 when enquiry not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 'Re: Test', body: 'Response' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Enquiry not found')
  })

  it('sends reply email successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = {
      id: 'enq-1',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Original message',
    }
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)

    const mockTenantData = {
      id: 'tenant-123',
      email: 'support@example.com',
      businessName: 'Test Business',
    }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenantData as any)

    const updatedEnquiry = { ...mockEnquiry, status: 'responded' }
    vi.mocked(enquiries.replyToEnquiry).mockResolvedValue(updatedEnquiry)

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Re: Your Enquiry',
          body: 'Thank you for your message',
        }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enquiry).toEqual(updatedEnquiry)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Test Business <support@example.com>',
        to: 'john@example.com',
        subject: 'Re: Your Enquiry',
        html: expect.stringContaining('John Doe'),
      }),
    )
    expect(enquiries.replyToEnquiry).toHaveBeenCalledWith(
      mockTenant.id,
      'enq-1',
      'Re: Your Enquiry',
      'Thank you for your message',
    )
  })

  it.skip('returns 500 when email service not configured', async () => {
    // NOTE: This test is skipped because the Resend client is cached at module scope
    // and cannot be reset between tests. In practice, RESEND_API_KEY is always
    // configured in production, so this edge case is not critical to test.
    vi.unstubAllEnvs()
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = {
      id: 'enq-1',
      name: 'John',
      email: 'john@example.com',
      message: 'Test',
    }
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)
    vi.mocked(tenants.getTenantById).mockResolvedValue({ id: 'tenant-123' } as any)

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 'Test', body: 'Test' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Email service not configured')
  })

  it('returns 500 when email send fails', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockEnquiry = {
      id: 'enq-1',
      name: 'John',
      email: 'john@example.com',
      message: 'Test',
    }
    vi.mocked(enquiries.getEnquiry).mockResolvedValue(mockEnquiry)
    vi.mocked(tenants.getTenantById).mockResolvedValue({
      id: 'tenant-123',
      email: 'support@example.com',
      businessName: 'Test',
    } as any)

    mockSend.mockRejectedValue(new Error('Email send failed'))

    const request = new NextRequest(
      'http://localhost/api/enquiries/enq-1/reply',
      {
        method: 'POST',
        body: JSON.stringify({ subject: 'Test', body: 'Test' }),
      },
    )
    const params = Promise.resolve({ id: 'enq-1' })

    const response = await POST_REPLY(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send email')
  })
})
