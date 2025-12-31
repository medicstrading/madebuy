import type { TypographyPreset } from '../types/tenant'

export type { TypographyPreset }

export interface TypographyConfig {
  name: string
  description: string
  heading: {
    fontFamily: string
    googleFont: string
    weights: number[]
  }
  body: {
    fontFamily: string
    googleFont: string
    weights: number[]
  }
}

export const TYPOGRAPHY_PRESETS: Record<TypographyPreset, TypographyConfig> = {
  modern: {
    name: 'Modern',
    description: 'Clean and contemporary with Outfit',
    heading: {
      fontFamily: "'Outfit', sans-serif",
      googleFont: 'Outfit',
      weights: [500, 600, 700],
    },
    body: {
      fontFamily: "'Outfit', sans-serif",
      googleFont: 'Outfit',
      weights: [400, 500],
    },
  },
  classic: {
    name: 'Classic',
    description: 'Timeless elegance with Merriweather and Open Sans',
    heading: {
      fontFamily: "'Merriweather', serif",
      googleFont: 'Merriweather',
      weights: [700, 900],
    },
    body: {
      fontFamily: "'Open Sans', sans-serif",
      googleFont: 'Open+Sans',
      weights: [400, 600],
    },
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated with Playfair Display and Lato',
    heading: {
      fontFamily: "'Playfair Display', serif",
      googleFont: 'Playfair+Display',
      weights: [600, 700],
    },
    body: {
      fontFamily: "'Lato', sans-serif",
      googleFont: 'Lato',
      weights: [400, 700],
    },
  },
  bold: {
    name: 'Bold',
    description: 'Strong and impactful with Montserrat and Roboto',
    heading: {
      fontFamily: "'Montserrat', sans-serif",
      googleFont: 'Montserrat',
      weights: [700, 800, 900],
    },
    body: {
      fontFamily: "'Roboto', sans-serif",
      googleFont: 'Roboto',
      weights: [400, 500],
    },
  },
  minimal: {
    name: 'Minimal',
    description: 'Sleek and modern with Space Grotesk',
    heading: {
      fontFamily: "'Space Grotesk', sans-serif",
      googleFont: 'Space+Grotesk',
      weights: [600, 700],
    },
    body: {
      fontFamily: "'Space Grotesk', sans-serif",
      googleFont: 'Space+Grotesk',
      weights: [400, 500],
    },
  },
}

export function getTypographyConfig(preset: TypographyPreset = 'modern'): TypographyConfig {
  return TYPOGRAPHY_PRESETS[preset] || TYPOGRAPHY_PRESETS.modern
}

export function getGoogleFontsUrl(preset: TypographyPreset = 'modern'): string {
  const config = getTypographyConfig(preset)
  const fonts = new Set<string>()

  // Add heading font with weights
  fonts.add(`${config.heading.googleFont}:wght@${config.heading.weights.join(';')}`)

  // Add body font with weights if different from heading
  if (config.body.googleFont !== config.heading.googleFont) {
    fonts.add(`${config.body.googleFont}:wght@${config.body.weights.join(';')}`)
  }

  return `https://fonts.googleapis.com/css2?${Array.from(fonts).map(f => `family=${f}`).join('&')}&display=swap`
}

export function getDefaultWebsiteDesign() {
  return {
    typography: 'modern' as TypographyPreset,
    layout: 'grid' as const,
    sections: [],
  }
}
