/**
 * Analytics Types
 * Type definitions for analytics and reporting
 */

export interface SalesSummary {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  currency: string
}

export interface PeriodComparison {
  current: SalesSummary
  previous: SalesSummary
  percentChange: {
    revenue: number
    orders: number
    aov: number
  }
}

export interface DailySales {
  date: string // YYYY-MM-DD
  revenue: number
  orderCount: number
}

export interface TopProduct {
  pieceId: string
  name: string
  totalSold: number
  revenue: number
  imageUrl?: string
}

export interface CustomerStats {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  topCustomers: TopCustomer[]
}

export interface TopCustomer {
  email: string
  name: string
  orderCount: number
  totalSpent: number
}

export interface CategoryBreakdown {
  category: string
  revenue: number
  orderCount: number
  percentage: number
}

export interface InventoryStats {
  totalProducts: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

export interface ConversionStats {
  views: number
  orders: number
  conversionRate: number
}

export interface AnalyticsOverview {
  period: string
  startDate: string
  endDate: string
  summary: PeriodComparison
  dailySales: DailySales[]
  topProducts: TopProduct[]
  categoryBreakdown: CategoryBreakdown[]
  inventoryStats: InventoryStats
  conversionRate: ConversionStats
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'year'
export type AnalyticsType = 'overview' | 'sales' | 'products' | 'customers' | 'inventory'
