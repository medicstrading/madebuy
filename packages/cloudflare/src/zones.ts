/**
 * Cloudflare Zones API
 * Manage DNS zones for domains
 */

import type { CloudflareClient } from './client'
import type { CloudflareZone, CreateZoneParams } from './types'

export class ZonesApi {
  constructor(private client: CloudflareClient) {}

  /**
   * List all zones accessible by the API token
   */
  async listZones(params?: {
    name?: string
    status?:
      | 'active'
      | 'pending'
      | 'initializing'
      | 'moved'
      | 'deleted'
      | 'deactivated'
    page?: number
    per_page?: number
  }): Promise<CloudflareZone[]> {
    const queryParams: Record<string, string> = {}
    if (params?.name) queryParams.name = params.name
    if (params?.status) queryParams.status = params.status
    if (params?.page) queryParams.page = String(params.page)
    if (params?.per_page) queryParams.per_page = String(params.per_page)

    const response = await this.client.get<CloudflareZone[]>(
      '/zones',
      queryParams,
    )
    return response.result
  }

  /**
   * Get a specific zone by ID
   */
  async getZone(zoneId: string): Promise<CloudflareZone> {
    const response = await this.client.get<CloudflareZone>(`/zones/${zoneId}`)
    return response.result
  }

  /**
   * Get a zone by domain name
   */
  async getZoneByName(domainName: string): Promise<CloudflareZone | null> {
    const zones = await this.listZones({ name: domainName })
    return zones.length > 0 ? zones[0] : null
  }

  /**
   * Create a new zone
   * Note: Requires the account ID to be set
   */
  async createZone(params: CreateZoneParams): Promise<CloudflareZone> {
    const response = await this.client.post<CloudflareZone>('/zones', params)
    return response.result
  }

  /**
   * Delete a zone
   */
  async deleteZone(zoneId: string): Promise<{ id: string }> {
    const response = await this.client.delete<{ id: string }>(
      `/zones/${zoneId}`,
    )
    return response.result
  }

  /**
   * Purge all cached content for a zone
   */
  async purgeCache(zoneId: string): Promise<{ id: string }> {
    const response = await this.client.post<{ id: string }>(
      `/zones/${zoneId}/purge_cache`,
      { purge_everything: true },
    )
    return response.result
  }

  /**
   * Check if a domain is on Cloudflare and get its zone
   */
  async checkDomainOnCloudflare(domain: string): Promise<{
    onCloudflare: boolean
    zone: CloudflareZone | null
    status: 'active' | 'pending' | 'not_found'
  }> {
    try {
      const zone = await this.getZoneByName(domain)
      if (zone) {
        return {
          onCloudflare: true,
          zone,
          status: zone.status === 'active' ? 'active' : 'pending',
        }
      }
      return { onCloudflare: false, zone: null, status: 'not_found' }
    } catch {
      return { onCloudflare: false, zone: null, status: 'not_found' }
    }
  }

  /**
   * Get nameservers for a zone
   */
  async getNameservers(zoneId: string): Promise<string[]> {
    const zone = await this.getZone(zoneId)
    return zone.name_servers
  }
}

/**
 * Create a zones API instance from a client
 */
export function createZonesApi(client: CloudflareClient): ZonesApi {
  return new ZonesApi(client)
}
