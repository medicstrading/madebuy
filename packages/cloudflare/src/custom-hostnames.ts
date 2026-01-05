/**
 * Cloudflare Custom Hostnames API (for SaaS)
 * https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
 *
 * This allows MadeBuy to provision custom domains for tenants with:
 * - Automatic SSL certificate provisioning
 * - CDN and DDoS protection
 * - Simplified DNS setup (single CNAME record)
 */

import type { CloudflareClient } from './client'

// Custom Hostname SSL settings
export interface CustomHostnameSsl {
  status:
    | 'initializing'
    | 'pending_validation'
    | 'pending_issuance'
    | 'pending_deployment'
    | 'active'
    | 'pending_expiration'
    | 'expired'
    | 'deleted'
  method: 'http' | 'txt' | 'cname'
  type: 'dv' // Domain Validated
  validation_records?: ValidationRecord[]
  validation_errors?: { message: string }[]
  settings?: {
    min_tls_version?: '1.0' | '1.1' | '1.2' | '1.3'
    early_hints?: 'on' | 'off'
    http2?: 'on' | 'off'
    tls_1_3?: 'on' | 'off'
  }
}

export interface ValidationRecord {
  txt_name?: string
  txt_value?: string
  http_url?: string
  http_body?: string
  cname?: string
  cname_target?: string
}

// Custom Hostname object
export interface CustomHostname {
  id: string
  hostname: string
  ssl: CustomHostnameSsl
  status: 'pending' | 'active' | 'pending_deletion' | 'deleted' | 'blocked'
  verification_errors?: string[]
  ownership_verification?: {
    type: 'txt'
    name: string
    value: string
  }
  ownership_verification_http?: {
    http_url: string
    http_body: string
  }
  custom_metadata?: Record<string, string>
  custom_origin_server?: string
  custom_origin_sni?: string
  created_at: string
}

// Parameters for creating a custom hostname
export interface CreateCustomHostnameParams {
  hostname: string
  ssl: {
    method: 'http' | 'txt' | 'cname'
    type: 'dv'
    settings?: {
      min_tls_version?: '1.0' | '1.1' | '1.2' | '1.3'
      early_hints?: 'on' | 'off'
    }
  }
  custom_metadata?: Record<string, string>
}

// Fallback origin for custom hostnames
export interface FallbackOrigin {
  origin: string
  status: 'active' | 'pending' | 'pending_deletion' | 'deleted'
}

/**
 * Custom Hostnames API
 * Manages custom domains for MadeBuy tenants via Cloudflare for SaaS
 */
export class CustomHostnamesApi {
  constructor(
    private client: CloudflareClient,
    private zoneId: string
  ) {}

  /**
   * Create a custom hostname for a tenant's domain
   *
   * @param hostname - The customer's domain (e.g., "www.acmefashion.com.au")
   * @param tenantId - MadeBuy tenant ID (stored in custom_metadata for lookup)
   * @returns The created custom hostname object
   */
  async create(hostname: string, tenantId: string): Promise<CustomHostname> {
    const params: CreateCustomHostnameParams = {
      hostname,
      ssl: {
        method: 'http', // HTTP DCV - works without customer DNS access
        type: 'dv',
        settings: {
          min_tls_version: '1.2',
          early_hints: 'on'
        }
      },
      custom_metadata: {
        tenant_id: tenantId,
        created_by: 'madebuy'
      }
    }

    const response = await this.client.post<CustomHostname>(
      `/zones/${this.zoneId}/custom_hostnames`,
      params
    )
    return response.result
  }

  /**
   * Get a custom hostname by ID
   *
   * @param hostnameId - The Cloudflare custom hostname ID
   * @returns The custom hostname object with current status
   */
  async get(hostnameId: string): Promise<CustomHostname> {
    const response = await this.client.get<CustomHostname>(
      `/zones/${this.zoneId}/custom_hostnames/${hostnameId}`
    )
    return response.result
  }

  /**
   * Get a custom hostname by hostname string
   *
   * @param hostname - The domain name (e.g., "www.acmefashion.com.au")
   * @returns The custom hostname object or null if not found
   */
  async getByHostname(hostname: string): Promise<CustomHostname | null> {
    const response = await this.client.get<CustomHostname[]>(
      `/zones/${this.zoneId}/custom_hostnames`,
      { hostname }
    )
    return response.result.length > 0 ? response.result[0] : null
  }

  /**
   * List all custom hostnames (with optional filtering)
   *
   * @param params - Optional filter parameters
   * @returns Array of custom hostname objects
   */
  async list(params?: {
    hostname?: string
    page?: number
    per_page?: number
    order?: 'hostname' | 'ssl' | 'status'
    direction?: 'asc' | 'desc'
  }): Promise<{ hostnames: CustomHostname[]; total: number }> {
    const queryParams: Record<string, string> = {}
    if (params?.hostname) queryParams.hostname = params.hostname
    if (params?.page) queryParams.page = params.page.toString()
    if (params?.per_page) queryParams.per_page = params.per_page.toString()
    if (params?.order) queryParams.order = params.order
    if (params?.direction) queryParams.direction = params.direction

    const response = await this.client.get<CustomHostname[]>(
      `/zones/${this.zoneId}/custom_hostnames`,
      queryParams
    )

    return {
      hostnames: response.result,
      total: response.result_info?.total_count ?? response.result.length
    }
  }

  /**
   * Delete a custom hostname
   *
   * @param hostnameId - The Cloudflare custom hostname ID
   */
  async delete(hostnameId: string): Promise<void> {
    await this.client.delete<{ id: string }>(
      `/zones/${this.zoneId}/custom_hostnames/${hostnameId}`
    )
  }

  /**
   * Refresh SSL certificate validation
   * Use this if SSL provisioning failed or timed out
   *
   * @param hostnameId - The Cloudflare custom hostname ID
   * @returns Updated custom hostname object
   */
  async refreshSsl(hostnameId: string): Promise<CustomHostname> {
    const response = await this.client.patch<CustomHostname>(
      `/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
      {
        ssl: {
          method: 'http',
          type: 'dv'
        }
      }
    )
    return response.result
  }

  /**
   * Update custom hostname metadata
   *
   * @param hostnameId - The Cloudflare custom hostname ID
   * @param metadata - Metadata key-value pairs to update
   * @returns Updated custom hostname object
   */
  async updateMetadata(
    hostnameId: string,
    metadata: Record<string, string>
  ): Promise<CustomHostname> {
    const response = await this.client.patch<CustomHostname>(
      `/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
      { custom_metadata: metadata }
    )
    return response.result
  }

  /**
   * Get the fallback origin for custom hostnames
   * This is where traffic is routed (e.g., shops.madebuy.com.au)
   */
  async getFallbackOrigin(): Promise<FallbackOrigin> {
    const response = await this.client.get<FallbackOrigin>(
      `/zones/${this.zoneId}/custom_hostnames/fallback_origin`
    )
    return response.result
  }

  /**
   * Set the fallback origin for custom hostnames
   *
   * @param origin - The origin domain (e.g., "shops.madebuy.com.au")
   */
  async setFallbackOrigin(origin: string): Promise<FallbackOrigin> {
    const response = await this.client.put<FallbackOrigin>(
      `/zones/${this.zoneId}/custom_hostnames/fallback_origin`,
      { origin }
    )
    return response.result
  }

  /**
   * Delete the fallback origin
   */
  async deleteFallbackOrigin(): Promise<void> {
    await this.client.delete<void>(
      `/zones/${this.zoneId}/custom_hostnames/fallback_origin`
    )
  }

  /**
   * Check if a hostname is ready (CNAME detected + SSL active)
   *
   * @param hostnameId - The Cloudflare custom hostname ID
   * @returns Status object with ready state and any issues
   */
  async checkStatus(hostnameId: string): Promise<{
    ready: boolean
    status: string
    sslStatus: string
    issues: string[]
  }> {
    const hostname = await this.get(hostnameId)

    const issues: string[] = []

    if (hostname.status !== 'active') {
      issues.push(`Hostname status: ${hostname.status}`)
    }

    if (hostname.ssl.status !== 'active') {
      issues.push(`SSL status: ${hostname.ssl.status}`)

      if (hostname.ssl.validation_errors?.length) {
        hostname.ssl.validation_errors.forEach(err => {
          issues.push(`SSL error: ${err.message}`)
        })
      }
    }

    if (hostname.verification_errors?.length) {
      hostname.verification_errors.forEach(err => {
        issues.push(`Verification error: ${err}`)
      })
    }

    return {
      ready: hostname.status === 'active' && hostname.ssl.status === 'active',
      status: hostname.status,
      sslStatus: hostname.ssl.status,
      issues
    }
  }
}

/**
 * Create a Custom Hostnames API instance
 *
 * @param client - Cloudflare API client
 * @param zoneId - The zone ID for madebuy.com.au (where custom hostnames are registered)
 */
export function createCustomHostnamesApi(
  client: CloudflareClient,
  zoneId: string
): CustomHostnamesApi {
  return new CustomHostnamesApi(client, zoneId)
}

/**
 * MadeBuy-specific helper to determine domain status from Cloudflare response
 */
export function mapCloudflareStatus(hostname: CustomHostname): {
  domainStatus: 'pending_cname' | 'pending_ssl' | 'active' | 'error'
  message: string
} {
  // Check for errors first
  if (hostname.status === 'blocked') {
    return {
      domainStatus: 'error',
      message: 'Domain is blocked. Please contact support.'
    }
  }

  if (hostname.ssl.validation_errors?.length) {
    return {
      domainStatus: 'error',
      message: hostname.ssl.validation_errors[0].message
    }
  }

  // Active and ready
  if (hostname.status === 'active' && hostname.ssl.status === 'active') {
    return {
      domainStatus: 'active',
      message: 'Domain is active and SSL is working'
    }
  }

  // SSL provisioning stages
  if (hostname.status === 'active' || hostname.status === 'pending') {
    const sslStatus = hostname.ssl.status

    if (sslStatus === 'pending_validation') {
      return {
        domainStatus: 'pending_cname',
        message: 'Waiting for DNS. Add a CNAME record pointing to shops.madebuy.com.au'
      }
    }

    if (sslStatus === 'pending_issuance' || sslStatus === 'pending_deployment') {
      return {
        domainStatus: 'pending_ssl',
        message: 'DNS verified. SSL certificate is being provisioned...'
      }
    }

    if (sslStatus === 'initializing') {
      return {
        domainStatus: 'pending_cname',
        message: 'Setting up domain. This may take a few minutes...'
      }
    }
  }

  // Fallback for pending status
  if (hostname.status === 'pending') {
    return {
      domainStatus: 'pending_cname',
      message: 'Waiting for CNAME record. Point your domain to shops.madebuy.com.au'
    }
  }

  // Unknown state
  return {
    domainStatus: 'error',
    message: `Unexpected status: ${hostname.status} / ${hostname.ssl.status}`
  }
}
