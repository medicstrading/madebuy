/**
 * Cryptographic utilities for encrypting sensitive data at rest.
 *
 * Uses AES-256-GCM for authenticated encryption of OAuth tokens
 * and other sensitive marketplace credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createLogger } from '@madebuy/shared'

const logger = createLogger({ service: 'crypto' })

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const ENCODING = 'base64' as const

/**
 * Get the encryption key from environment.
 * Key must be 32 bytes (256 bits) for AES-256.
 *
 * Generate with: openssl rand -base64 32
 */
function getEncryptionKey(): Buffer {
  const key = process.env.MARKETPLACE_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'MARKETPLACE_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -base64 32',
    )
  }

  // Decode base64 key
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error(
      `MARKETPLACE_ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded. ` +
        `Got ${keyBuffer.length} bytes. Generate with: openssl rand -base64 32`,
    )
  }

  return keyBuffer
}

/**
 * Check if encryption is properly configured.
 * Returns false if MARKETPLACE_ENCRYPTION_KEY is not set.
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.MARKETPLACE_ENCRYPTION_KEY
  if (!key) return false

  try {
    const keyBuffer = Buffer.from(key, 'base64')
    return keyBuffer.length === 32
  } catch {
    return false
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a base64-encoded string in the format:
 * base64(IV + ciphertext + authTag)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted data as base64 string
 * @throws Error if encryption key is not configured
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()

  // Generate a random IV for each encryption
  const iv = randomBytes(IV_LENGTH)

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // Get the authentication tag
  const authTag = cipher.getAuthTag()

  // Combine IV + ciphertext + authTag
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString(ENCODING)
}

/**
 * Decrypt a ciphertext string encrypted with AES-256-GCM.
 *
 * Expects base64-encoded string in the format:
 * base64(IV + ciphertext + authTag)
 *
 * @param ciphertext - The encrypted data as base64 string
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or data is tampered
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()

  // Decode the combined data
  const combined = Buffer.from(ciphertext, ENCODING)

  // Minimum length: IV (12) + at least 1 byte + authTag (16) = 29 bytes
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short')
  }

  // Extract IV, ciphertext, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(
    IV_LENGTH,
    combined.length - AUTH_TAG_LENGTH,
  )

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  // Set the auth tag for verification
  decipher.setAuthTag(authTag)

  // Decrypt and return
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Safely encrypt a value, returning the original if encryption is not configured.
 * Logs a warning in development mode if encryption is not configured.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string or original if encryption not configured
 */
export function encryptIfConfigured(plaintext: string): string {
  if (!isEncryptionConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        '[SECURITY WARNING] MARKETPLACE_ENCRYPTION_KEY not configured. ' +
          'OAuth tokens will be stored in plaintext.',
      )
    }
    return plaintext
  }
  return encrypt(plaintext)
}

/**
 * Safely decrypt a value, handling both encrypted and plaintext values.
 * This allows for backwards compatibility with existing unencrypted data.
 *
 * @param ciphertext - The encrypted (or plaintext) string
 * @returns Decrypted string
 */
export function decryptIfConfigured(ciphertext: string): string {
  if (!isEncryptionConfigured()) {
    return ciphertext
  }

  // Try to decrypt. If it fails, assume it's unencrypted legacy data.
  try {
    return decrypt(ciphertext)
  } catch {
    // Likely unencrypted legacy data
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        '[SECURITY WARNING] Found unencrypted token in database. ' +
          'Consider running a migration to encrypt existing tokens.',
      )
    }
    return ciphertext
  }
}
