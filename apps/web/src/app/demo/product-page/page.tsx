// Server component wrapper - enables dynamic rendering
export const dynamic = 'force-dynamic'

import { ProductPageClient } from './ProductPageClient'

export default function ProductPageDemo() {
  return <ProductPageClient />
}
