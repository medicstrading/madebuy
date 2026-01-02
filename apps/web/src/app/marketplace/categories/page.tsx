import Link from 'next/link'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'
import { Sparkles, Package } from 'lucide-react'

// Skip static generation - client components in layout use hooks
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Categories - MadeBuy Marketplace',
  description: 'Browse all product categories on MadeBuy marketplace.',
}

export default function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Categories</h1>
        <p className="text-gray-600">
          Explore handmade products across all categories
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MARKETPLACE_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/marketplace/categories/${category.slug}`}
            className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            {/* Category Header */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6">
              <div className="mb-3 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                  {/* Icon placeholder - could use actual icons */}
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <h2 className="text-center text-xl font-bold text-gray-900">
                {category.name}
              </h2>
            </div>

            {/* Category Details */}
            <div className="p-4">
              <p className="mb-3 text-sm text-gray-600">
                Browse handmade {category.name.toLowerCase()} from independent makers
              </p>

              {/* Subcategories */}
              <div className="mb-3 flex flex-wrap gap-2">
                {category.subcategories.slice(0, 4).map((sub) => (
                  <span
                    key={sub}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {sub}
                  </span>
                ))}
                {category.subcategories.length > 4 && (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    +{category.subcategories.length - 4} more
                  </span>
                )}
              </div>

              {/* Product count placeholder */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Package className="h-4 w-4" />
                <span>Products coming soon</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
