import type { RegionalSettings } from '@madebuy/shared'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Regional context for formatting functions
// This is set by the RegionalProvider component at the app level
let regionalContext: RegionalSettings | null = null

const DEFAULT_SETTINGS: RegionalSettings = {
  countryCode: 'AU',
  currency: 'AUD',
  locale: 'en-AU',
  timezone: 'Australia/Sydney',
  measurementSystem: 'metric',
}

export function setRegionalContext(settings: RegionalSettings | null) {
  regionalContext = settings
}

export function getRegionalContext(): RegionalSettings {
  return regionalContext || DEFAULT_SETTINGS
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const { locale, customLocale } = getRegionalContext()
  return new Intl.DateTimeFormat(customLocale || locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(
  date: Date | string,
  includeTimezone = false,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const { locale, customLocale, timezone, customTimezone } =
    getRegionalContext()
  const tz = customTimezone || timezone

  return new Intl.DateTimeFormat(customLocale || locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
    ...(includeTimezone && { timeZoneName: 'short' }),
  }).format(d)
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const { locale, customLocale, timezone, customTimezone } =
    getRegionalContext()
  const tz = customTimezone || timezone

  return new Intl.DateTimeFormat(customLocale || locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(d)
}

export function formatCurrency(
  amount: number,
  currencyOverride?: string,
): string {
  const { locale, customLocale, currency, customCurrency } =
    getRegionalContext()
  const curr = currencyOverride || customCurrency || currency

  return new Intl.NumberFormat(customLocale || locale, {
    style: 'currency',
    currency: curr,
  }).format(amount)
}

export function formatNumber(num: number): string {
  const { locale, customLocale } = getRegionalContext()
  return new Intl.NumberFormat(customLocale || locale).format(num)
}

export function formatWeight(grams: number): string {
  const { measurementSystem } = getRegionalContext()

  if (measurementSystem === 'imperial') {
    const pounds = grams * 0.00220462
    if (pounds < 1) {
      const ounces = grams * 0.035274
      return `${ounces.toFixed(1)} oz`
    }
    return `${pounds.toFixed(1)} lb`
  }

  // Metric
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`
  }
  return `${Math.round(grams)} g`
}

export function formatDistance(meters: number): string {
  const { measurementSystem } = getRegionalContext()

  if (measurementSystem === 'imperial') {
    const miles = meters * 0.000621371
    if (miles < 1) {
      const feet = meters * 3.28084
      return `${Math.round(feet)} ft`
    }
    return `${miles.toFixed(1)} mi`
  }

  // Metric
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatDimensions(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
): string {
  const { measurementSystem } = getRegionalContext()

  if (measurementSystem === 'imperial') {
    const l = (lengthCm * 0.393701).toFixed(1)
    const w = (widthCm * 0.393701).toFixed(1)
    const h = (heightCm * 0.393701).toFixed(1)
    return `${l}" × ${w}" × ${h}"`
  }

  return `${lengthCm} × ${widthCm} × ${heightCm} cm`
}

// Get the effective currency code for the current context
export function getEffectiveCurrency(): string {
  const { currency, customCurrency } = getRegionalContext()
  return customCurrency || currency
}

// Get the effective timezone for the current context
export function getEffectiveTimezone(): string {
  const { timezone, customTimezone } = getRegionalContext()
  return customTimezone || timezone
}
