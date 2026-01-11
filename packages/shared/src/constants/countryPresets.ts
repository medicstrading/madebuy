import type { MeasurementSystem } from '../types/tenant'

export interface CountryPreset {
  code: string                    // ISO 3166-1 alpha-2
  name: string                    // Display name
  currency: string                // ISO 4217 currency code
  currencySymbol: string          // Currency symbol (e.g., '$', '£')
  locale: string                  // BCP 47 locale
  timezone: string                // Primary IANA timezone
  measurementSystem: MeasurementSystem
  flag: string                    // Unicode flag emoji
  popularTimezones?: string[]     // For countries with multiple zones
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    measurementSystem: 'metric',
    flag: '🇦🇺',
    popularTimezones: [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Perth',
      'Australia/Adelaide',
      'Australia/Hobart',
      'Australia/Darwin',
    ],
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    timezone: 'America/New_York',
    measurementSystem: 'imperial',
    flag: '🇺🇸',
    popularTimezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'Pacific/Honolulu',
      'America/Anchorage',
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    timezone: 'Europe/London',
    measurementSystem: 'metric',
    flag: '🇬🇧',
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    measurementSystem: 'metric',
    flag: '🇨🇦',
    popularTimezones: [
      'America/Toronto',
      'America/Vancouver',
      'America/Edmonton',
      'America/Winnipeg',
      'America/Halifax',
    ],
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    currencySymbol: '$',
    locale: 'en-NZ',
    timezone: 'Pacific/Auckland',
    measurementSystem: 'metric',
    flag: '🇳🇿',
    popularTimezones: ['Pacific/Auckland', 'Pacific/Chatham'],
  },
  {
    code: 'IE',
    name: 'Ireland',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'en-IE',
    timezone: 'Europe/Dublin',
    measurementSystem: 'metric',
    flag: '🇮🇪',
  },
  {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    measurementSystem: 'metric',
    flag: '🇩🇪',
  },
  {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    measurementSystem: 'metric',
    flag: '🇫🇷',
  },
  {
    code: 'NL',
    name: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'nl-NL',
    timezone: 'Europe/Amsterdam',
    measurementSystem: 'metric',
    flag: '🇳🇱',
  },
  {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: '$',
    locale: 'en-SG',
    timezone: 'Asia/Singapore',
    measurementSystem: 'metric',
    flag: '🇸🇬',
  },
  {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    measurementSystem: 'metric',
    flag: '🇯🇵',
  },
]

export function getCountryPreset(code: string): CountryPreset | undefined {
  return COUNTRY_PRESETS.find((c) => c.code === code)
}

export function getCountryByName(name: string): CountryPreset | undefined {
  const lowerName = name.toLowerCase()
  return COUNTRY_PRESETS.find((c) => c.name.toLowerCase() === lowerName)
}

// Default regional settings (Australia)
export const DEFAULT_REGIONAL_SETTINGS = {
  countryCode: 'AU',
  currency: 'AUD',
  locale: 'en-AU',
  timezone: 'Australia/Sydney',
  measurementSystem: 'metric' as MeasurementSystem,
}
