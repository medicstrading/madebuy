/**
 * Password Strength Validation
 * Enforces minimum security requirements for passwords
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  score: number // 0-4 strength score
}

export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
}

// Default requirements for customer passwords
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
}

// Stricter requirements for admin/tenant passwords
export const ADMIN_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

/**
 * Validate password strength against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(
      `Password must be at least ${requirements.minLength} characters`,
    )
  } else {
    score++
    // Bonus for longer passwords
    if (password.length >= 12) score++
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else if (/[A-Z]/.test(password)) {
    score++
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check numbers
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  } else if (/\d/.test(password)) {
    score++
  }

  // Check special characters
  if (
    requirements.requireSpecialChars &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push('Password must contain at least one special character')
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++
  }

  // Check for common weak patterns
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
    /^welcome/i,
    /(.)\1{3,}/, // 4+ repeated characters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password is too common or contains repeated patterns')
      score = Math.max(0, score - 1)
      break
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(4, score),
  }
}

/**
 * Get human-readable password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return 'Very Weak'
    case 1:
      return 'Weak'
    case 2:
      return 'Fair'
    case 3:
      return 'Strong'
    case 4:
      return 'Very Strong'
    default:
      return 'Unknown'
  }
}
