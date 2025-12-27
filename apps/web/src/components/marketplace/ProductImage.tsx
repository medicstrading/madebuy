import Image from 'next/image'

interface ProductImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
}

/**
 * IP-protected product image component
 * - Disables right-click context menu
 * - Disables drag/drop
 * - Prevents selection
 */
export function ProductImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
}: ProductImageProps) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className="select-none"
    >
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        draggable={false}
        className={`pointer-events-none ${className}`}
        style={{ userSelect: 'none' }}
      />
    </div>
  )
}
