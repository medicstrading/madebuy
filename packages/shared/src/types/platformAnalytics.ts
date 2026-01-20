/**
 * Platform Analytics Types
 * Cross-tenant metrics for the platform admin dashboard
 */

// Revenue Metrics
export interface MRRDataPoint {
  date: string
  mrr: number
  newMrr: number
  expansionMrr: number
  churnedMrr: number
}

export interface MRRBreakdown {
  totalMrr: number
  newMrr: number
  expansionMrr: number
  churnedMrr: number
  netMrrGrowth: number
  growthRate: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  orderCount: number
  avgOrderValue: number
}

export interface RevenueByTier {
  tier: string
  revenue: number
  count: number
  percentage: number
}

export interface TopSeller {
  tenantId: string
  businessName: string
  slug: string
  plan: string
  totalRevenue: number
  orderCount: number
  avgOrderValue: number
}

// Tenant Metrics
export interface TenantCounts {
  total: number
  active: number
  trial: number
  churned: number
  suspended: number
}

export interface SignupDataPoint {
  date: string
  signups: number
  conversions: number
  conversionRate: number
}

export interface TenantsByPlan {
  plan: string
  count: number
  percentage: number
  mrr: number
}

export interface TenantHealthScore {
  tenantId: string
  businessName: string
  email?: string
  slug: string
  plan: string
  score: number // 0-100
  lastActive: Date | null
  productCount: number
  orderCount: number
  totalRevenue?: number
  daysSinceLastLogin: number
  riskLevel: 'healthy' | 'at-risk' | 'churning'
}

export interface FeatureAdoption {
  feature: string
  adoptionCount: number
  adoptionRate: number
  availableToCount: number
}

// Marketplace Metrics
export interface MarketplaceStats {
  totalPieces: number
  activeStorefronts: number
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  cartAbandonmentRate: number
}

export interface OrdersDataPoint {
  date: string
  orders: number
  revenue: number
}

export interface TopProduct {
  pieceId: string
  pieceName: string
  tenantId: string
  businessName: string
  orderCount: number
  revenue: number
  views: number
}

// System Health
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  uptime: number
  lastChecked: Date
  components: ComponentHealth[]
  // Extended metrics for dashboard
  avgLatency?: number
  requestsPerMinute?: number
  successRate?: number
  errorsLast24h?: number
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'critical'
  latency?: number
  errorRate?: number
  details?: string
}

export interface MongoStats {
  connections: number
  availableConnections: number
  storageSize: number
  dataSize: number
  indexSize: number
  collections: CollectionStats[]
}

export interface CollectionStats {
  name: string
  count: number
  size: number
  avgObjSize: number
  indexCount: number
}

export interface ErrorStats {
  timestamp: string
  count: number
  types: Record<string, number>
}

export interface WebhookStats {
  total: number
  successful: number
  failed: number
  pending: number
  avgResponseTime: number
}

// Dashboard Summary
export interface DashboardSummary {
  mrr: number
  mrrGrowth: number
  activeTenants: number
  tenantGrowth: number
  ordersToday: number
  revenueToday: number
  systemStatus: 'healthy' | 'degraded' | 'critical'
  alerts: DashboardAlert[]
}

export interface DashboardAlert {
  id: string
  type: 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  acknowledged: boolean
}
