/**
 * @madebuy/cloudflare
 * Cloudflare API integration for domain and DNS management
 */

// Client
export {
  CloudflareApiError,
  CloudflareClient,
  createCloudflareClient,
  createTenantCloudflareClient,
} from './client'
// Custom Hostname Types
export type {
  CreateCustomHostnameParams,
  CustomHostname,
  CustomHostnameSsl,
  FallbackOrigin,
  ValidationRecord,
} from './custom-hostnames'
// Custom Hostnames API (Cloudflare for SaaS)
export {
  CustomHostnamesApi,
  createCustomHostnamesApi,
  mapCloudflareStatus,
} from './custom-hostnames'
// DNS API
export { createDnsApi, DnsApi, MADEBUY_DNS_CONFIG } from './dns'

// Types
export type {
  CloudflareConfig,
  CloudflareDnsRecord,
  CloudflareError,
  CloudflareResponse,
  CloudflareSslSettings,
  CloudflareSslVerification,
  CloudflareZone,
  CreateDnsRecordParams,
  CreateZoneParams,
  DnsRecordType,
  MadeBuyDnsRequirements,
  UpdateDnsRecordParams,
} from './types'
// Zones API
export { createZonesApi, ZonesApi } from './zones'

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
