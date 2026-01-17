/**
 * Cloudflare API Types
 * Based on Cloudflare API v4
 */

export interface CloudflareConfig {
  apiToken: string
  accountId?: string
}

// API Response wrapper
export interface CloudflareResponse<T> {
  success: boolean
  errors: CloudflareError[]
  messages: string[]
  result: T
  result_info?: {
    page: number
    per_page: number
    count: number
    total_count: number
    total_pages: number
  }
}

export interface CloudflareError {
  code: number
  message: string
}

// Zone types
export interface CloudflareZone {
  id: string
  name: string
  status:
    | 'active'
    | 'pending'
    | 'initializing'
    | 'moved'
    | 'deleted'
    | 'deactivated'
  paused: boolean
  type: 'full' | 'partial'
  development_mode: number
  name_servers: string[]
  original_name_servers: string[]
  original_registrar: string | null
  original_dnshost: string | null
  modified_on: string
  created_on: string
  activated_on: string | null
  meta: {
    step: number
    custom_certificate_quota: number
    page_rule_quota: number
    phishing_detected: boolean
    multiple_railguns_allowed: boolean
  }
  owner: {
    id: string
    type: string
    email: string
  }
  account: {
    id: string
    name: string
  }
  permissions: string[]
  plan: {
    id: string
    name: string
    price: number
    currency: string
    frequency: string
    is_subscribed: boolean
    can_subscribe: boolean
    legacy_id: string
    legacy_discount: boolean
    externally_managed: boolean
  }
}

export interface CreateZoneParams {
  name: string
  account: {
    id: string
  }
  type?: 'full' | 'partial'
  jump_start?: boolean
}

// DNS Record types
export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'TXT'
  | 'MX'
  | 'NS'
  | 'SRV'
  | 'CAA'

export interface CloudflareDnsRecord {
  id: string
  zone_id: string
  zone_name: string
  name: string
  type: DnsRecordType
  content: string
  proxiable: boolean
  proxied: boolean
  ttl: number
  locked: boolean
  meta: {
    auto_added: boolean
    managed_by_apps: boolean
    managed_by_argo_tunnel: boolean
  }
  comment: string | null
  tags: string[]
  created_on: string
  modified_on: string
}

export interface CreateDnsRecordParams {
  type: DnsRecordType
  name: string
  content: string
  ttl?: number
  proxied?: boolean
  priority?: number // For MX records
  comment?: string
}

export interface UpdateDnsRecordParams {
  type?: DnsRecordType
  name?: string
  content?: string
  ttl?: number
  proxied?: boolean
  priority?: number
  comment?: string
}

// SSL Certificate types
export interface CloudflareSslSettings {
  id: string
  value: 'off' | 'flexible' | 'full' | 'strict'
  editable: boolean
  modified_on: string
}

export interface CloudflareSslVerification {
  certificate_status:
    | 'active'
    | 'pending_validation'
    | 'pending_issuance'
    | 'pending_deployment'
    | 'pending_deletion'
    | 'deleted'
    | 'validation_timed_out'
    | 'issuance_timed_out'
    | 'deployment_timed_out'
    | 'deletion_timed_out'
  verification_type: 'http' | 'cname' | 'txt' | 'email'
  verification_status:
    | 'active'
    | 'pending'
    | 'initializing'
    | 'expired'
    | 'inactive'
    | 'deleted'
  hostname: string
  signature: string
}

// Helper type for our domain setup
export interface MadeBuyDnsRequirements {
  aRecord: {
    name: string
    value: string
    exists: boolean
  }
  cnameRecord: {
    name: string
    value: string
    exists: boolean
  }
  txtRecord: {
    name: string
    value: string
    exists: boolean
  }
  allConfigured: boolean
}
