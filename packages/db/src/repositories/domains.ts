import { getDatabase } from '../client'
import type { Tenant, DomainStatus } from '@madebuy/shared'
import dns from 'dns/promises'

/**
 * Domains Repository
 * Handles custom domain management and verification
 */

export interface DomainVerificationResult {
  verified: boolean
  status: DomainStatus
  message: string
  nameservers?: string[]
}

/**
 * Get tenant by custom domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const db = await getDatabase()

  // Normalize domain (lowercase, no trailing dot)
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '')

  const tenant = await db.collection('tenants').findOne({
    customDomain: normalizedDomain,
    domainStatus: 'active',
  })

  return tenant as Tenant | null
}

/**
 * Check if a domain is available (not used by another tenant)
 */
export async function isDomainAvailable(
  domain: string,
  excludeTenantId?: string
): Promise<boolean> {
  const db = await getDatabase()

  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '')

  const query: any = { customDomain: normalizedDomain }
  if (excludeTenantId) {
    query.id = { $ne: excludeTenantId }
  }

  const existing = await db.collection('tenants').findOne(query)

  return !existing
}

/**
 * Set custom domain for a tenant
 */
export async function setCustomDomain(
  tenantId: string,
  domain: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDatabase()

  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '')

  // Check if domain is available
  const available = await isDomainAvailable(normalizedDomain, tenantId)
  if (!available) {
    return { success: false, message: 'Domain is already in use' }
  }

  // Validate domain format
  if (!isValidDomain(normalizedDomain)) {
    return { success: false, message: 'Invalid domain format' }
  }

  // Update tenant with pending status
  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        customDomain: normalizedDomain,
        domainStatus: 'pending_nameservers',
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    message: 'Domain added. Please update your nameservers to complete verification.',
  }
}

/**
 * Remove custom domain from tenant
 */
export async function removeCustomDomain(tenantId: string): Promise<void> {
  const db = await getDatabase()

  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        domainStatus: 'none',
        updatedAt: new Date(),
      },
      $unset: {
        customDomain: '',
        cloudflareZoneId: '',
        nameservers: '',
      },
    }
  )
}

/**
 * Verify domain DNS configuration
 * Checks if the domain points to the correct MadeBuy servers
 */
export async function verifyDomain(
  tenantId: string,
  domain: string
): Promise<DomainVerificationResult> {
  try {
    const normalizedDomain = domain.toLowerCase().replace(/\.$/, '')

    // Check for CNAME record pointing to madebuy
    try {
      const cnameRecords = await dns.resolveCname(normalizedDomain)
      const hasMadeBuyCname = cnameRecords.some(
        record => record.includes('madebuy.com.au') || record.includes('shops.madebuy.com.au')
      )

      if (hasMadeBuyCname) {
        // Domain is verified via CNAME
        await updateDomainStatus(tenantId, 'active')
        return {
          verified: true,
          status: 'active',
          message: 'Domain verified successfully via CNAME record',
        }
      }
    } catch {
      // No CNAME, try A record
    }

    // Check for A record pointing to MadeBuy IP
    // Note: Replace with actual Vercel/hosting IP
    const expectedIPs = [
      '76.76.21.21', // Vercel's edge IP (example)
    ]

    try {
      const aRecords = await dns.resolve4(normalizedDomain)
      const hasCorrectIP = aRecords.some(ip => expectedIPs.includes(ip))

      if (hasCorrectIP) {
        await updateDomainStatus(tenantId, 'active')
        return {
          verified: true,
          status: 'active',
          message: 'Domain verified successfully via A record',
        }
      }
    } catch {
      // No A record
    }

    // Check for TXT record (alternative verification)
    try {
      const txtRecords = await dns.resolveTxt(normalizedDomain)
      const verificationToken = `madebuy-verify=${tenantId}`
      const hasVerificationTxt = txtRecords.some(
        records => records.some(r => r === verificationToken)
      )

      if (hasVerificationTxt) {
        await updateDomainStatus(tenantId, 'active')
        return {
          verified: true,
          status: 'active',
          message: 'Domain verified successfully via TXT record',
        }
      }
    } catch {
      // No TXT record
    }

    return {
      verified: false,
      status: 'pending_nameservers',
      message: 'Domain DNS not configured. Please add a CNAME record pointing to shops.madebuy.com.au or add a TXT record with madebuy-verify=' + tenantId,
    }
  } catch (error) {
    console.error('Domain verification error:', error)
    return {
      verified: false,
      status: 'pending_nameservers',
      message: 'Failed to verify domain. Please check DNS configuration.',
    }
  }
}

/**
 * Update domain status
 */
async function updateDomainStatus(
  tenantId: string,
  status: DomainStatus
): Promise<void> {
  const db = await getDatabase()

  await db.collection('tenants').updateOne(
    { id: tenantId },
    {
      $set: {
        domainStatus: status,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * Get domain status for a tenant
 */
export async function getDomainStatus(tenantId: string): Promise<{
  domain: string | null
  status: DomainStatus
  verificationToken: string
}> {
  const db = await getDatabase()

  const tenant = await db.collection('tenants').findOne({ id: tenantId })

  return {
    domain: tenant?.customDomain || null,
    status: tenant?.domainStatus || 'none',
    verificationToken: `madebuy-verify=${tenantId}`,
  }
}

/**
 * List all active custom domains (for SSL certificate management)
 */
export async function listActiveCustomDomains(): Promise<string[]> {
  const db = await getDatabase()

  const tenants = await db.collection('tenants')
    .find({
      customDomain: { $exists: true, $ne: null },
      domainStatus: 'active',
    })
    .project({ customDomain: 1 })
    .toArray()

  return tenants.map(t => t.customDomain).filter(Boolean) as string[]
}
