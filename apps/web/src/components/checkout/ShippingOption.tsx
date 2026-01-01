'use client'

import {
  ShippingQuote,
  formatShippingPrice,
  formatDeliveryDays,
  formatDeliveryEstimate,
} from '@/lib/checkout/shipping'

interface ShippingOptionProps {
  quote: ShippingQuote
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

// Carrier logos/icons mapping
const carrierInfo: Record<string, { name: string; icon: string }> = {
  sendle: {
    name: 'Sendle',
    icon: 'S',
  },
  auspost: {
    name: 'Australia Post',
    icon: 'AP',
  },
  store: {
    name: 'Store Shipping',
    icon: 'SS',
  },
  manual: {
    name: 'Standard Delivery',
    icon: 'SD',
  },
}

export function ShippingOption({
  quote,
  selected,
  onSelect,
  disabled = false,
}: ShippingOptionProps) {
  const carrier = carrierInfo[quote.carrier] || {
    name: quote.carrier,
    icon: quote.carrier.charAt(0).toUpperCase(),
  }

  const isFree = quote.price === 0
  const isLocalPickup = quote.id === 'local-pickup'

  return (
    <label
      className={`
        relative flex cursor-pointer rounded-lg border p-4 transition-all
        ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300 hover:bg-blue-50/50'}
        ${selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}
      `}
    >
      <input
        type="radio"
        name="shipping-option"
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
        aria-labelledby={`shipping-${quote.id}-label`}
        aria-describedby={`shipping-${quote.id}-description`}
      />

      {/* Carrier Icon */}
      <div
        className={`
          flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold
          ${isLocalPickup ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
          ${selected ? 'bg-blue-100 text-blue-700' : ''}
        `}
      >
        {isLocalPickup ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="ml-4 flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span
            id={`shipping-${quote.id}-label`}
            className="text-sm font-medium text-gray-900"
          >
            {quote.service}
          </span>
          <span
            className={`text-sm font-semibold ${
              isFree ? 'text-green-600' : 'text-gray-900'
            }`}
          >
            {formatShippingPrice(quote.price, quote.currency)}
          </span>
        </div>

        <div
          id={`shipping-${quote.id}-description`}
          className="mt-1 flex items-center text-sm text-gray-500"
        >
          {!isLocalPickup && (
            <>
              <span>{carrier.name}</span>
              <span className="mx-2">-</span>
            </>
          )}
          <span>{formatDeliveryDays(quote)}</span>
        </div>

        {/* Estimated delivery date */}
        <div className="mt-1 text-xs text-gray-400">
          Est. delivery: {formatDeliveryEstimate(quote)}
        </div>

        {/* Features */}
        {quote.features && quote.features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {quote.features.map((feature, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Selected indicator */}
      <div className="ml-4 flex-shrink-0">
        <div
          className={`
            flex h-5 w-5 items-center justify-center rounded-full border-2
            ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
          `}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z" />
            </svg>
          )}
        </div>
      </div>
    </label>
  )
}

export default ShippingOption
