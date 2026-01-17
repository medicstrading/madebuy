'use client'

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (
    item: T,
    index: number,
    virtualItem: VirtualItem,
  ) => React.ReactNode
  estimatedItemSize?: number
  className?: string
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number
}

/**
 * VirtualizedList - Generic virtualized list component for large data sets
 *
 * Uses @tanstack/react-virtual for efficient rendering of long lists.
 * Only renders items currently visible in the viewport plus overscan.
 *
 * @example
 * <VirtualizedList
 *   items={products}
 *   estimatedItemSize={80}
 *   renderItem={(product, index) => (
 *     <ProductRow key={product.id} product={product} />
 *   )}
 * />
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  estimatedItemSize = 50,
  className = '',
  overscan = 5,
  getItemKey,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(
              items[virtualItem.index],
              virtualItem.index,
              virtualItem,
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface VirtualizedGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimatedRowHeight?: number
  columns: number
  className?: string
  overscan?: number
  gap?: number
  getItemKey?: (item: T, index: number) => string | number
}

/**
 * VirtualizedGrid - Virtualized grid component for large collections
 *
 * Renders items in a grid layout with virtualized rows.
 * Useful for media galleries and product grids.
 *
 * @example
 * <VirtualizedGrid
 *   items={media}
 *   columns={4}
 *   estimatedRowHeight={200}
 *   gap={16}
 *   renderItem={(item) => (
 *     <MediaThumbnail key={item.id} item={item} />
 *   )}
 * />
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  estimatedRowHeight = 200,
  columns,
  className = '',
  overscan = 2,
  gap = 16,
  getItemKey,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate rows from items
  const rows = useMemo(() => {
    const result: T[][] = []
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns))
    }
    return result
  }, [items, columns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
    getItemKey: getItemKey
      ? (index) => {
          const firstItem = rows[index]?.[0]
          return firstItem ? getItemKey(firstItem, index * columns) : index
        }
      : undefined,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: `${gap}px`,
              paddingBottom:
                virtualRow.index < rows.length - 1 ? `${gap}px` : 0,
            }}
          >
            {rows[virtualRow.index].map((item, colIndex) => {
              const globalIndex = virtualRow.index * columns + colIndex
              return (
                <div
                  key={getItemKey ? getItemKey(item, globalIndex) : globalIndex}
                >
                  {renderItem(item, globalIndex)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

interface VirtualizedTableProps<T> {
  items: T[]
  renderRow: (item: T, index: number) => React.ReactNode
  renderHeader: () => React.ReactNode
  estimatedRowHeight?: number
  className?: string
  headerClassName?: string
  bodyClassName?: string
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number
}

/**
 * VirtualizedTable - Virtualized table component with fixed header
 *
 * Renders table rows with virtualization while keeping the header fixed.
 * Useful for inventory lists and order tables.
 *
 * @example
 * <VirtualizedTable
 *   items={orders}
 *   estimatedRowHeight={60}
 *   renderHeader={() => (
 *     <tr>
 *       <th>Order</th>
 *       <th>Customer</th>
 *       <th>Total</th>
 *     </tr>
 *   )}
 *   renderRow={(order) => (
 *     <tr key={order.id}>
 *       <td>{order.orderNumber}</td>
 *       <td>{order.customerName}</td>
 *       <td>{order.total}</td>
 *     </tr>
 *   )}
 * />
 */
export function VirtualizedTable<T>({
  items,
  renderRow,
  renderHeader,
  estimatedRowHeight = 50,
  className = '',
  headerClassName = 'bg-gray-50',
  bodyClassName = 'bg-white',
  overscan = 10,
  getItemKey,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className={`rounded-lg shadow overflow-hidden ${className}`}>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: '70vh' }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`sticky top-0 z-10 ${headerClassName}`}>
            {renderHeader()}
          </thead>
          <tbody className={`divide-y divide-gray-200 ${bodyClassName}`}>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={100}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No items found
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer for items above viewport */}
                {virtualItems.length > 0 && virtualItems[0].start > 0 && (
                  <tr style={{ height: virtualItems[0].start }} />
                )}
                {virtualItems.map((virtualItem) => (
                  <tr
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    style={{ height: estimatedRowHeight }}
                  >
                    {/* Render the row content as table cells */}
                    {(() => {
                      const rowContent = renderRow(
                        items[virtualItem.index],
                        virtualItem.index,
                      )
                      // If renderRow returns a tr element, extract its children
                      // Otherwise, wrap in a single td
                      if (
                        rowContent &&
                        typeof rowContent === 'object' &&
                        'props' in rowContent
                      ) {
                        const element = rowContent as React.ReactElement
                        if (
                          element.type === 'tr' ||
                          (element.props as { children?: React.ReactNode })
                            ?.children
                        ) {
                          return (
                            element.props as { children?: React.ReactNode }
                          )?.children
                        }
                      }
                      return <td colSpan={100}>{rowContent}</td>
                    })()}
                  </tr>
                ))}
                {/* Spacer for items below viewport */}
                {virtualItems.length > 0 && (
                  <tr
                    style={{
                      height:
                        virtualizer.getTotalSize() -
                        (virtualItems[virtualItems.length - 1]?.end || 0),
                    }}
                  />
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
