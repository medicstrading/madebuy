/**
 * Celebration Milestones
 * Defines achievements that trigger celebratory moments
 */

export interface Milestone {
  id: string
  title: string
  description: string
  icon: string // emoji or icon name
}

export const MILESTONES: Record<string, Milestone> = {
  FIRST_PRODUCT: {
    id: 'first_product',
    title: 'First Product Listed!',
    description: "You've added your first product. Your maker journey begins!",
    icon: '🎉',
  },
  FIRST_ORDER: {
    id: 'first_order',
    title: 'First Sale!',
    description: 'Congratulations on your first order!',
    icon: '💰',
  },
  TEN_PRODUCTS: {
    id: 'ten_products',
    title: '10 Products!',
    description: 'Your catalog is growing!',
    icon: '📦',
  },
  TEN_ORDERS: {
    id: 'ten_orders',
    title: '10 Orders!',
    description: "You're on a roll!",
    icon: '🚀',
  },
  STORE_LIVE: {
    id: 'store_live',
    title: 'Store is Live!',
    description: 'Your storefront is ready for customers!',
    icon: '🏪',
  },
} as const

/**
 * Get milestone by ID
 */
export function getMilestone(id: string): Milestone | undefined {
  return Object.values(MILESTONES).find((m) => m.id === id)
}

/**
 * Check which celebrations a tenant should see
 */
export interface CelebrationCheckParams {
  productCount: number
  orderCount: number
  isStorePublished: boolean
  alreadyShown: string[]
}

export function getPendingCelebrations(
  params: CelebrationCheckParams,
): Milestone[] {
  const { productCount, orderCount, isStorePublished, alreadyShown } = params
  const pending: Milestone[] = []

  // First product
  if (
    productCount >= 1 &&
    !alreadyShown.includes(MILESTONES.FIRST_PRODUCT.id)
  ) {
    pending.push(MILESTONES.FIRST_PRODUCT)
  }

  // First order
  if (orderCount >= 1 && !alreadyShown.includes(MILESTONES.FIRST_ORDER.id)) {
    pending.push(MILESTONES.FIRST_ORDER)
  }

  // Ten products
  if (
    productCount >= 10 &&
    !alreadyShown.includes(MILESTONES.TEN_PRODUCTS.id)
  ) {
    pending.push(MILESTONES.TEN_PRODUCTS)
  }

  // Ten orders
  if (orderCount >= 10 && !alreadyShown.includes(MILESTONES.TEN_ORDERS.id)) {
    pending.push(MILESTONES.TEN_ORDERS)
  }

  // Store live
  if (isStorePublished && !alreadyShown.includes(MILESTONES.STORE_LIVE.id)) {
    pending.push(MILESTONES.STORE_LIVE)
  }

  return pending
}
