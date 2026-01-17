/**
 * Cryptographic utilities for secure token encryption/decryption
 * Uses AES-256-GCM for authenticated encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

/**
 * Derive an encryption key from a password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

/**
 * Get encryption key from environment variable
 * Falls back to NEXTAUTH_SECRET if TOKEN_ENCRYPTION_KEY not set
 */
function getEncryptionKey(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for token encryption',
    )
  }
  return key
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns base64-encoded ciphertext with embedded IV, salt, and auth tag
 */
export function encrypt(plaintext: string): string {
  const password = getEncryptionKey()
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a base64-encoded ciphertext encrypted with encrypt()
 * Returns the original plaintext string
 */
export function decrypt(ciphertext: string): string {
  const password = getEncryptionKey()
  const combined = Buffer.from(ciphertext, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  )
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(password, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a string is encrypted (base64 with correct structure)
 */
export function isEncrypted(value: string): boolean {
  try {
    const buffer = Buffer.from(value, 'base64')
    // Minimum size: salt + iv + authTag + at least 1 byte of data
    return buffer.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}
