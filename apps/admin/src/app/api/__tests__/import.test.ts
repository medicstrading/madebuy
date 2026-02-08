import { imports } from '@madebuy/db'
import { uploadToR2, getFromR2 } from '@madebuy/storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Mock CSV parser (not mocked in setup.ts)
vi.mock('@/lib/csv-parser', () => ({
  detectSource: vi.fn().mockReturnValue('shopify'),
  parseCSV: vi.fn().mockReturnValue({ headers: ['name', 'price'], rows: [['Test', '10']] }),
  suggestColumnMapping: vi.fn().mockReturnValue({ name: 'name', price: 'price' }),
  validateAndParse: vi.fn().mockReturnValue({ rows: [], errors: [], warnings: [] }),
  generatePreview: vi.fn().mockReturnValue([]),
}))

// Import handlers AFTER setup (which already mocks @/lib/session)
import { GET as listImports } from '../import/route'
import { POST as uploadImport } from '../import/upload/route'
import { DELETE as deleteImport, GET as getImport } from '../import/[jobId]/route'
import { POST as validateImport } from '../import/[jobId]/validate/route'
import { POST as confirmImport } from '../import/[jobId]/confirm/route'

describe('Import API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/import', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/import')
      const res = await listImports(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('lists import jobs successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockResult = {
        jobs: [
          { id: 'job-1', filename: 'products.csv', status: 'uploaded' },
          { id: 'job-2', filename: 'inventory.csv', status: 'completed' },
        ],
        total: 2,
      }
      vi.mocked(imports.listImportJobs).mockResolvedValue(mockResult)

      const req = createRequest('/api/import?limit=10&offset=0')
      const res = await listImports(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        jobs: mockResult.jobs,
        total: 2,
        limit: 10,
        offset: 0,
      })
    })
  })

  describe('POST /api/import/upload', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'text/csv' }), 'test.csv')

      const req = createRequest('/api/import/upload', { method: 'POST' })
      const res = await uploadImport(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when no file is provided', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      // Mock formData.get to return null
      const req = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(null),
        }),
      } as any

      const res = await uploadImport(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'No file provided' })
    })
  })

  describe('GET /api/import/[jobId]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/import/job-1')
      const res = await getImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when import job not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue(null)

      const req = createRequest('/api/import/job-999')
      const res = await getImport(req, { params: Promise.resolve({ jobId: 'job-999' }) })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Import job not found' })
    })

    it('gets import job successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockJob = {
        id: 'job-1',
        filename: 'products.csv',
        status: 'uploaded',
        rowCount: 100,
      }
      vi.mocked(imports.getImportJob).mockResolvedValue(mockJob as any)

      const req = createRequest('/api/import/job-1')
      const res = await getImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ job: mockJob })
    })
  })

  describe('DELETE /api/import/[jobId]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/import/job-1', { method: 'DELETE' })
      const res = await deleteImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when import job not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue(null)

      const req = createRequest('/api/import/job-999', { method: 'DELETE' })
      const res = await deleteImport(req, {
        params: Promise.resolve({ jobId: 'job-999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Import job not found' })
    })

    it('returns 400 when trying to delete processing job', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue({
        id: 'job-1',
        status: 'processing',
      } as any)

      const req = createRequest('/api/import/job-1', { method: 'DELETE' })
      const res = await deleteImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Cannot delete job while processing' })
    })

    it('deletes import job successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue({
        id: 'job-1',
        status: 'uploaded',
      } as any)
      vi.mocked(imports.deleteImportJob).mockResolvedValue(true)

      const req = createRequest('/api/import/job-1', { method: 'DELETE' })
      const res = await deleteImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })

  describe('POST /api/import/[jobId]/validate', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/import/job-1/validate', { method: 'POST' })
      const res = await validateImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when import job not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue(null)

      const req = createRequest('/api/import/job-999/validate', { method: 'POST' })
      const res = await validateImport(req, {
        params: Promise.resolve({ jobId: 'job-999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Import job not found' })
    })

    it('returns 400 when job status is not uploaded', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue({
        id: 'job-1',
        status: 'completed',
      } as any)

      const req = createRequest('/api/import/job-1/validate', {
        method: 'POST',
        body: {},
      })
      const res = await validateImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Cannot validate')
    })
  })

  describe('POST /api/import/[jobId]/confirm', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/import/job-1/confirm', { method: 'POST' })
      const res = await confirmImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when import job not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue(null)

      const req = createRequest('/api/import/job-999/confirm', { method: 'POST' })
      const res = await confirmImport(req, {
        params: Promise.resolve({ jobId: 'job-999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Import job not found' })
    })

    it('returns 400 when job is not validated', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(imports.getImportJob).mockResolvedValue({
        id: 'job-1',
        status: 'uploaded',
      } as any)

      const req = createRequest('/api/import/job-1/confirm', { method: 'POST' })
      const res = await confirmImport(req, { params: Promise.resolve({ jobId: 'job-1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Must be validated first')
    })
  })
})
