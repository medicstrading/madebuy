/**
 * @madebuy/cloudflare
 * Cloudflare API integration for domain and DNS management
 */

// Client
export {
  CloudflareClient,
  CloudflareApiError,
  createCloudflareClient,
  createTenantCloudflareClient,
} from './client'

// Zones API
export { ZonesApi, createZonesApi } from './zones'

// DNS API
export { DnsApi, createDnsApi, MADEBUY_DNS_CONFIG } from './dns'

// Custom Hostnames API (Cloudflare for SaaS)
export {
  CustomHostnamesApi,
  createCustomHostnamesApi,
  mapCloudflareStatus,
} from './custom-hostnames'

// Types
export type {
  CloudflareConfig,
  CloudflareResponse,
  CloudflareError,
  CloudflareZone,
  CreateZoneParams,
  DnsRecordType,
  CloudflareDnsRecord,
  CreateDnsRecordParams,
  UpdateDnsRecordParams,
  CloudflareSslSettings,
  CloudflareSslVerification,
  MadeBuyDnsRequirements,
} from './types'

// Custom Hostname Types
export type {
  CustomHostname,
  CustomHostnameSsl,
  ValidationRecord,
  CreateCustomHostnameParams,
  FallbackOrigin,
} from './custom-hostnames'

/**
 * Convenience function to create a full Cloudflare API client
 * with zones, DNS, and custom hostnames APIs
 */
export function createCloudflareApis(config: {
  apiToken: string
  accountId?: string
  zoneId?: string
}) {
  const { CloudflareClient } = require('./client')
  const { createZonesApi } = require('./zones')
  const { createDnsApi } = require('./dns')
  const { createCustomHostnamesApi } = require('./custom-hostnames')

  const client = new CloudflareClient(config)
  return {
    client,
    zones: createZonesApi(client),
    dns: createDnsApi(client),
    // Custom hostnames requires zone ID (for madebuy.com.au)
    customHostnames: config.zoneId
      ? createCustomHostnamesApi(client, config.zoneId)
      : null,
  }
}
