import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Semantic breadcrumb navigation component with Schema.org microdata.
 * Provides both visual navigation and SEO benefits.
 */
export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-sm ${className}`}
    >
      <ol
        className="flex items-center gap-1 flex-wrap"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li
              key={item.href}
              className="flex items-center"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRight
                  className="w-4 h-4 mx-1 text-gray-400 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="text-gray-600 font-medium truncate max-w-[200px]"
                  itemProp="name"
                  aria-current="page"
                  title={item.name}
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.name}</span>
                </Link>
              )}

              <meta itemProp="position" content={String(index + 1)} />
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
