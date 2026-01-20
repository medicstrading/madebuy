import { jwtVerify, SignJWT } from 'jose'

// Fail fast if secrets are not configured - no weak fallbacks
function getImpersonationSecret(): Uint8Array {
  const secret = process.env.IMPERSONATION_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      'IMPERSONATION_SECRET or NEXTAUTH_SECRET must be set. ' +
        'Generate with: openssl rand -hex 32',
    )
  }
  if (secret.length < 32) {
    throw new Error('IMPERSONATION_SECRET must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

// Lazy initialization to allow startup without immediate failure in dev
let _impersonationSecret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (!_impersonationSecret) {
    _impersonationSecret = getImpersonationSecret()
  }
  return _impersonationSecret
}

export interface ImpersonationPayload {
  tenantId: string
  adminId: string
  adminEmail: string
  adminName: string
  impersonatedAt: number
  expiresAt: number
}

/**
 * Create a signed impersonation token
 * Token is valid for 10 minutes
 */
export async function createImpersonationToken(
  payload: Omit<ImpersonationPayload, 'impersonatedAt' | 'expiresAt'>,
): Promise<string> {
  const now = Date.now()
  const expiresAt = now + 10 * 60 * 1000 // 10 minutes

  const token = await new SignJWT({
    ...payload,
    impersonatedAt: now,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getSecret())

  return token
}

/**
 * Verify and decode an impersonation token
 */
export async function verifyImpersonationToken(
  token: string,
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())

    // Check if token has expired
    if (
      payload.expiresAt &&
      typeof payload.expiresAt === 'number' &&
      Date.now() > payload.expiresAt
    ) {
      return null
    }

    return payload as unknown as ImpersonationPayload
  } catch (error) {
    console.error('Failed to verify impersonation token:', error)
    return null
  }
}
