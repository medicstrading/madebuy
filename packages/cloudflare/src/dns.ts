/**
 * Cloudflare DNS Records API
 * Manage DNS records within zones
 */

import type { CloudflareClient } from './client'
import type {
  CloudflareDnsRecord,
  CreateDnsRecordParams,
  UpdateDnsRecordParams,
  DnsRecordType,
  MadeBuyDnsRequirements,
} from './types'

// MadeBuy infrastructure configuration
const MADEBUY_CNAME_TARGET = 'shops.madebuy.com.au'
const MADEBUY_A_RECORD_IP = '76.76.21.21' // Vercel edge IP - update as needed

export class DnsApi {
  constructor(private client: CloudflareClient) {}

  /**
   * List all DNS records for a zone
   */
  async listRecords(
    zoneId: string,
    params?: {
      type?: DnsRecordType
      name?: string
      content?: string
      page?: number
      per_page?: number
    }
  ): Promise<CloudflareDnsRecord[]> {
    const queryParams: Record<string, string> = {}
    if (params?.type) queryParams.type = params.type
    if (params?.name) queryParams.name = params.name
    if (params?.content) queryParams.content = params.content
    if (params?.page) queryParams.page = String(params.page)
    if (params?.per_page) queryParams.per_page = String(params.per_page)

    const response = await this.client.get<CloudflareDnsRecord[]>(
      `/zones/${zoneId}/dns_records`,
      queryParams
    )
    return response.result
  }

  /**
   * Get a specific DNS record
   */
  async getRecord(zoneId: string, recordId: string): Promise<CloudflareDnsRecord> {
    const response = await this.client.get<CloudflareDnsRecord>(
      `/zones/${zoneId}/dns_records/${recordId}`
    )
    return response.result
  }

  /**
   * Create a new DNS record
   */
  async createRecord(
    zoneId: string,
    params: CreateDnsRecordParams
  ): Promise<CloudflareDnsRecord> {
    const response = await this.client.post<CloudflareDnsRecord>(
      `/zones/${zoneId}/dns_records`,
      {
        type: params.type,
        name: params.name,
        content: params.content,
        ttl: params.ttl || 1, // 1 = automatic
        proxied: params.proxied ?? false,
        priority: params.priority,
        comment: params.comment,
      }
    )
    return response.result
  }

  /**
   * Update an existing DNS record
   */
  async updateRecord(
    zoneId: string,
    recordId: string,
    params: UpdateDnsRecordParams
  ): Promise<CloudflareDnsRecord> {
    const response = await this.client.patch<CloudflareDnsRecord>(
      `/zones/${zoneId}/dns_records/${recordId}`,
      params
    )
    return response.result
  }

  /**
   * Delete a DNS record
   */
  async deleteRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    const response = await this.client.delete<{ id: string }>(
      `/zones/${zoneId}/dns_records/${recordId}`
    )
    return response.result
  }

  /**
   * Find a record by type and name
   */
  async findRecord(
    zoneId: string,
    type: DnsRecordType,
    name: string
  ): Promise<CloudflareDnsRecord | null> {
    const records = await this.listRecords(zoneId, { type, name })
    return records.length > 0 ? records[0] : null
  }

  /**
   * Create or update a record (upsert)
   */
  async upsertRecord(
    zoneId: string,
    params: CreateDnsRecordParams
  ): Promise<CloudflareDnsRecord> {
    const existing = await this.findRecord(zoneId, params.type, params.name)

    if (existing) {
      // Check if content is different
      if (existing.content === params.content) {
        return existing // No update needed
      }
      return this.updateRecord(zoneId, existing.id, {
        content: params.content,
        ttl: params.ttl,
        proxied: params.proxied,
      })
    }

    return this.createRecord(zoneId, params)
  }

  /**
   * Check MadeBuy DNS requirements for a domain
   */
  async checkMadeBuyDnsRequirements(
    zoneId: string,
    domain: string
  ): Promise<MadeBuyDnsRequirements> {
    const records = await this.listRecords(zoneId)

    // Check for A record on root domain
    const aRecord = records.find(
      r => r.type === 'A' && (r.name === domain || r.name === '@')
    )
    const hasCorrectARecord = aRecord?.content === MADEBUY_A_RECORD_IP

    // Check for CNAME on www
    const wwwRecord = records.find(
      r => r.type === 'CNAME' && (r.name === `www.${domain}` || r.name === 'www')
    )
    const hasCorrectCname = wwwRecord?.content === MADEBUY_CNAME_TARGET

    // Check for verification TXT record
    const txtRecord = records.find(
      r => r.type === 'TXT' && r.content.startsWith('madebuy-verify=')
    )
    const hasVerificationTxt = !!txtRecord

    return {
      aRecord: {
        name: domain,
        value: MADEBUY_A_RECORD_IP,
        exists: hasCorrectARecord,
      },
      cnameRecord: {
        name: `www.${domain}`,
        value: MADEBUY_CNAME_TARGET,
        exists: hasCorrectCname,
      },
      txtRecord: {
        name: domain,
        value: txtRecord?.content || '',
        exists: hasVerificationTxt,
      },
      allConfigured: hasCorrectARecord && hasCorrectCname && hasVerificationTxt,
    }
  }

  /**
   * Configure DNS records for MadeBuy
   * Sets up A record for root, CNAME for www, and TXT for verification
   */
  async configureMadeBuyDns(
    zoneId: string,
    domain: string,
    tenantId: string
  ): Promise<{
    success: boolean
    records: CloudflareDnsRecord[]
    errors: string[]
  }> {
    const records: CloudflareDnsRecord[] = []
    const errors: string[] = []

    // Create A record for root domain
    try {
      const aRecord = await this.upsertRecord(zoneId, {
        type: 'A',
        name: '@',
        content: MADEBUY_A_RECORD_IP,
        proxied: true, // Enable Cloudflare proxy for SSL
        comment: 'MadeBuy root domain',
      })
      records.push(aRecord)
    } catch (error) {
      errors.push(`Failed to create A record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Create CNAME for www
    try {
      const cnameRecord = await this.upsertRecord(zoneId, {
        type: 'CNAME',
        name: 'www',
        content: MADEBUY_CNAME_TARGET,
        proxied: true,
        comment: 'MadeBuy www subdomain',
      })
      records.push(cnameRecord)
    } catch (error) {
      errors.push(`Failed to create CNAME record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Create TXT verification record
    try {
      const txtRecord = await this.upsertRecord(zoneId, {
        type: 'TXT',
        name: '@',
        content: `madebuy-verify=${tenantId}`,
        comment: 'MadeBuy domain verification',
      })
      records.push(txtRecord)
    } catch (error) {
      errors.push(`Failed to create TXT record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      success: errors.length === 0,
      records,
      errors,
    }
  }

  /**
   * Remove MadeBuy DNS records from a zone
   */
  async removeMadeBuyDns(zoneId: string, domain: string): Promise<{
    success: boolean
    deletedCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let deletedCount = 0

    const records = await this.listRecords(zoneId)

    // Find and delete MadeBuy-related records
    for (const record of records) {
      const isMadeBuyRecord =
        (record.type === 'A' && record.content === MADEBUY_A_RECORD_IP) ||
        (record.type === 'CNAME' && record.content === MADEBUY_CNAME_TARGET) ||
        (record.type === 'TXT' && record.content.startsWith('madebuy-verify='))

      if (isMadeBuyRecord) {
        try {
          await this.deleteRecord(zoneId, record.id)
          deletedCount++
        } catch (error) {
          errors.push(`Failed to delete ${record.type} record: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
    }
  }
}

/**
 * Create a DNS API instance from a client
 */
export function createDnsApi(client: CloudflareClient): DnsApi {
  return new DnsApi(client)
}

/**
 * Export infrastructure constants for reference
 */
export const MADEBUY_DNS_CONFIG = {
  cnameTarget: MADEBUY_CNAME_TARGET,
  aRecordIp: MADEBUY_A_RECORD_IP,
}
