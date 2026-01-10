'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShippingAddress,
  AUSTRALIAN_STATES,
  SUPPORTED_COUNTRIES,
  isValidPostcode,
  getStateFromPostcode,
  isPostcodeInState,
} from '@/lib/checkout/shipping'

interface AddressFormProps {
  value: Partial<ShippingAddress>
  onChange: (address: ShippingAddress) => void
  errors?: Record<string, string>
  disabled?: boolean
  showContactFields?: boolean
}

export function AddressForm({
  value,
  onChange,
  errors = {},
  disabled = false,
  showContactFields = true,
}: AddressFormProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [postcodeWarning, setPostcodeWarning] = useState<string | null>(null)

  // Merge external errors with local validation errors
  const allErrors = { ...localErrors, ...errors }

  // Handle field changes
  const handleChange = useCallback(
    (field: keyof ShippingAddress & string, fieldValue: string) => {
      const newAddress: ShippingAddress = {
        name: value.name || '',
        phone: value.phone || '',
        email: value.email || '',
        line1: value.line1 || '',
        line2: value.line2 || '',
        suburb: value.suburb || '',
        state: value.state || '',
        postcode: value.postcode || '',
        country: value.country || 'AU',
        deliveryInstructions: value.deliveryInstructions || '',
        [field]: fieldValue,
      }

      // Clear local error for this field
      if (localErrors[field]) {
        setLocalErrors(prev => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }

      onChange(newAddress)
    },
    [value, onChange, localErrors]
  )

  // Auto-detect state from postcode for AU
  useEffect(() => {
    if (value.country === 'AU' && value.postcode && value.postcode.length === 4) {
      const detectedState = getStateFromPostcode(value.postcode)
      if (detectedState && !value.state) {
        handleChange('state', detectedState)
      }

      // Warn if postcode doesn't match selected state
      if (value.state && detectedState && detectedState !== value.state) {
        setPostcodeWarning(
          `Postcode ${value.postcode} is typically in ${detectedState}, not ${value.state}`
        )
      } else {
        setPostcodeWarning(null)
      }
    } else {
      setPostcodeWarning(null)
    }
  }, [value.postcode, value.state, value.country, handleChange])

  // Validate postcode on blur
  const handlePostcodeBlur = () => {
    if (value.postcode && value.country) {
      if (!isValidPostcode(value.postcode, value.country)) {
        setLocalErrors(prev => ({
          ...prev,
          postcode: 'Invalid postcode format',
        }))
      }
    }
  }

  // Validate state/postcode match on blur (AU only)
  const handleStateBlur = () => {
    if (value.country === 'AU' && value.postcode && value.state) {
      if (!isPostcodeInState(value.postcode, value.state)) {
        setPostcodeWarning(
          `Postcode ${value.postcode} may not match ${value.state}`
        )
      }
    }
  }

  const inputClasses = (fieldName: string) =>
    `mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
      allErrors[fieldName]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`

  const labelClasses = 'block text-sm font-medium text-gray-700'

  const isAustralia = value.country === 'AU'

  return (
    <div className="space-y-4">
      {/* Contact Fields */}
      {showContactFields && (
        <>
          <div>
            <label htmlFor="address-name" className={labelClasses}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="address-name"
              name="name"
              required
              disabled={disabled}
              value={value.name || ''}
              onChange={e => handleChange('name', e.target.value)}
              className={inputClasses('name')}
              placeholder="John Smith"
              autoComplete="name"
            />
            {allErrors.name && (
              <p className="mt-1 text-sm text-red-600">{allErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="address-email" className={labelClasses}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="address-email"
                name="email"
                required
                disabled={disabled}
                value={value.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                className={inputClasses('email')}
                placeholder="john@example.com"
                autoComplete="email"
              />
              {allErrors.email && (
                <p className="mt-1 text-sm text-red-600">{allErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="address-phone" className={labelClasses}>
                Phone
              </label>
              <input
                type="tel"
                id="address-phone"
                name="phone"
                disabled={disabled}
                value={value.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                className={inputClasses('phone')}
                placeholder="0400 000 000"
                autoComplete="tel"
              />
              {allErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{allErrors.phone}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Address Line 1 */}
      <div>
        <label htmlFor="address-line1" className={labelClasses}>
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="address-line1"
          name="line1"
          required
          disabled={disabled}
          value={value.line1 || ''}
          onChange={e => handleChange('line1', e.target.value)}
          className={inputClasses('line1')}
          placeholder="123 Main Street"
          autoComplete="address-line1"
        />
        {allErrors.line1 && (
          <p className="mt-1 text-sm text-red-600">{allErrors.line1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label htmlFor="address-line2" className={labelClasses}>
          Apartment, suite, etc. <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          id="address-line2"
          name="line2"
          disabled={disabled}
          value={value.line2 || ''}
          onChange={e => handleChange('line2', e.target.value)}
          className={inputClasses('line2')}
          placeholder="Apt 4B"
          autoComplete="address-line2"
        />
      </div>

      {/* Suburb and State Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-suburb" className={labelClasses}>
            {isAustralia ? 'Suburb' : 'City'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address-suburb"
            name="suburb"
            required
            disabled={disabled}
            value={value.suburb || ''}
            onChange={e => handleChange('suburb', e.target.value)}
            className={inputClasses('suburb')}
            placeholder={isAustralia ? 'Sydney' : 'City'}
            autoComplete="address-level2"
          />
          {allErrors.suburb && (
            <p className="mt-1 text-sm text-red-600">{allErrors.suburb}</p>
          )}
        </div>

        <div>
          <label htmlFor="address-state" className={labelClasses}>
            {isAustralia ? 'State' : 'State/Province'} <span className="text-red-500">*</span>
          </label>
          {isAustralia ? (
            <select
              id="address-state"
              name="state"
              required
              disabled={disabled}
              value={value.state || ''}
              onChange={e => handleChange('state', e.target.value)}
              onBlur={handleStateBlur}
              className={inputClasses('state')}
              autoComplete="address-level1"
            >
              <option value="">Select state</option>
              {AUSTRALIAN_STATES.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id="address-state"
              name="state"
              required
              disabled={disabled}
              value={value.state || ''}
              onChange={e => handleChange('state', e.target.value)}
              className={inputClasses('state')}
              placeholder="State/Province"
              autoComplete="address-level1"
            />
          )}
          {allErrors.state && (
            <p className="mt-1 text-sm text-red-600">{allErrors.state}</p>
          )}
        </div>
      </div>

      {/* Postcode and Country Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-postcode" className={labelClasses}>
            {value.country === 'US' ? 'ZIP Code' : 'Postcode'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address-postcode"
            name="postcode"
            required
            disabled={disabled}
            value={value.postcode || ''}
            onChange={e => handleChange('postcode', e.target.value)}
            onBlur={handlePostcodeBlur}
            className={inputClasses('postcode')}
            placeholder={isAustralia ? '2000' : 'Postcode'}
            autoComplete="postal-code"
            maxLength={isAustralia ? 4 : 10}
          />
          {allErrors.postcode && (
            <p className="mt-1 text-sm text-red-600">{allErrors.postcode}</p>
          )}
          {postcodeWarning && !allErrors.postcode && (
            <p className="mt-1 text-sm text-amber-600">{postcodeWarning}</p>
          )}
        </div>

        <div>
          <label htmlFor="address-country" className={labelClasses}>
            Country <span className="text-red-500">*</span>
          </label>
          <select
            id="address-country"
            name="country"
            required
            disabled={disabled}
            value={value.country || 'AU'}
            onChange={e => handleChange('country', e.target.value)}
            className={inputClasses('country')}
            autoComplete="country"
          >
            {SUPPORTED_COUNTRIES.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {allErrors.country && (
            <p className="mt-1 text-sm text-red-600">{allErrors.country}</p>
          )}
        </div>
      </div>

      {/* Delivery Instructions */}
      <div>
        <label htmlFor="address-instructions" className={labelClasses}>
          Delivery Instructions <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="address-instructions"
          name="deliveryInstructions"
          disabled={disabled}
          value={value.deliveryInstructions || ''}
          onChange={e => handleChange('deliveryInstructions', e.target.value)}
          className={inputClasses('deliveryInstructions')}
          placeholder="Leave at front door, ring doorbell, etc."
          rows={2}
        />
      </div>
    </div>
  )
}

export default AddressForm
