import { tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Setup mocks (must happen before imports)
const mockValidatePassword = vi.fn()
vi.mock('@madebuy/shared', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    validatePassword: (password: string, requirements: unknown) =>
      mockValidatePassword(password, requirements),
    DEFAULT_PASSWORD_REQUIREMENTS: { minLength: 8 },
    ADMIN_PASSWORD_REQUIREMENTS: { minLength: 8 },
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  }
})

// Import route handlers after mocks
import { POST as registerPost } from '../auth/register/route'
import { POST as forgotPasswordPost } from '../auth/forgot-password/route'
import { POST as resetPasswordPost } from '../auth/reset-password/route'

describe('Auth API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new tenant successfully', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(tenants.getTenantByEmail).mockResolvedValue(null)
      vi.mocked(tenants.createTenant).mockResolvedValue({
        id: 'tenant-new',
        email: 'new@example.com',
        businessName: 'New Shop',
        slug: 'new-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'SecurePass123',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Account created successfully')
      expect(data.tenant).toEqual({
        id: 'tenant-new',
        email: 'new@example.com',
        businessName: 'New Shop',
        slug: 'new-shop',
      })
      expect(tenants.createTenant).toHaveBeenCalledWith(
        'new@example.com',
        '$2a$10$hashedpassword',
        'New Shop',
      )
    })

    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'SecurePass123',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email, password, and business name are required')
    })

    it('should return 400 when password is missing', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email, password, and business name are required')
    })

    it('should return 400 when businessName is missing', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email, password, and business name are required')
    })

    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 409 when email already exists', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(tenants.getTenantByEmail).mockResolvedValue({
        id: 'existing-tenant',
        email: 'existing@example.com',
        businessName: 'Existing Shop',
        slug: 'existing-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('An account with this email already exists')
    })

    it('should return 400 for weak password', async () => {
      mockValidatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'weak',
          businessName: 'New Shop',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters long')
    })

    it('should return 400 when business name is too short', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'SecurePass123',
          businessName: 'A',
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(
        'Business name must be between 2 and 100 characters',
      )
    })

    it('should return 400 when business name is too long', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'SecurePass123',
          businessName: 'A'.repeat(101),
        }),
      })

      const response = await registerPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(
        'Business name must be between 2 and 100 characters',
      )
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email successfully', async () => {
      vi.mocked(tenants.getTenantByEmail).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest(
        'http://localhost/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        },
      )

      const response = await forgotPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe(
        'If an account with that email exists, we sent a password reset link.',
      )
    })

    it('should return 400 when email is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )

      const response = await forgotPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest(
        'http://localhost/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'invalid-email' }),
        },
      )

      const response = await forgotPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return success even when email does not exist (prevent enumeration)', async () => {
      vi.mocked(tenants.getTenantByEmail).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@example.com' }),
        },
      )

      const response = await forgotPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe(
        'If an account with that email exists, we sent a password reset link.',
      )
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully with valid token', async () => {
      const { passwordResets, auditLog } = await import('@madebuy/db')

      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(passwordResets.validateAndConsumeToken).mockResolvedValue(
        'tenant-123',
      )
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(auditLog.logAuditEvent).mockResolvedValue()

      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'valid-reset-token',
            password: 'NewSecurePass123',
          }),
        },
      )

      const response = await resetPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Password reset successfully')
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        passwordHash: '$2a$10$hashedpassword',
      })
    })

    it('should return 400 when token is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'NewSecurePass123' }),
        },
      )

      const response = await resetPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token and password are required')
    })

    it('should return 400 when password is missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'valid-reset-token' }),
        },
      )

      const response = await resetPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token and password are required')
    })

    it('should return 400 for invalid/expired token', async () => {
      const { passwordResets } = await import('@madebuy/db')

      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(passwordResets.validateAndConsumeToken).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'invalid-token',
            password: 'NewSecurePass123',
          }),
        },
      )

      const response = await resetPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired reset token')
    })

    it('should return 400 for weak password', async () => {
      mockValidatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'valid-reset-token',
            password: 'weak',
          }),
        },
      )

      const response = await resetPasswordPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters long')
    })
  })
})
