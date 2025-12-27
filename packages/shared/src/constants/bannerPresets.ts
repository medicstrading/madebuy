export interface BannerPreset {
  id: string
  name: string
  description: string
  style: 'minimal' | 'bold' | 'elegant' | 'vibrant' | 'modern'
  overlayText: string
  overlaySubtext: string
  ctaButton: {
    text: string
    url: string
  }
  overlayOpacity: number
  height: 'small' | 'medium' | 'large'
  imageUrl: string // Placeholder gradient or pattern
  colorScheme: {
    primary: string
    text: string
  }
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Simple and elegant with subtle overlay',
    style: 'minimal',
    overlayText: 'Welcome to Our Store',
    overlaySubtext: 'Discover handcrafted treasures',
    ctaButton: {
      text: 'Shop Now',
      url: '/products',
    },
    overlayOpacity: 30,
    height: 'medium',
    imageUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    colorScheme: {
      primary: '#667eea',
      text: '#ffffff',
    },
  },
  {
    id: 'bold',
    name: 'Bold Statement',
    description: 'High contrast with strong messaging',
    style: 'bold',
    overlayText: 'Elevate Your Style',
    overlaySubtext: 'Premium handmade products that stand out',
    ctaButton: {
      text: 'Explore Collection',
      url: '/products',
    },
    overlayOpacity: 50,
    height: 'large',
    imageUrl: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    colorScheme: {
      primary: '#f5576c',
      text: '#ffffff',
    },
  },
  {
    id: 'elegant',
    name: 'Elegant Luxury',
    description: 'Sophisticated with refined aesthetic',
    style: 'elegant',
    overlayText: 'Timeless Elegance',
    overlaySubtext: 'Curated pieces for the discerning collector',
    ctaButton: {
      text: 'View Collection',
      url: '/products',
    },
    overlayOpacity: 40,
    height: 'medium',
    imageUrl: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
    colorScheme: {
      primary: '#8b7355',
      text: '#2d2d2d',
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrant Energy',
    description: 'Colorful and energetic atmosphere',
    style: 'vibrant',
    overlayText: 'Handmade with Love',
    overlaySubtext: 'Unique pieces that spark joy',
    ctaButton: {
      text: 'Start Shopping',
      url: '/products',
    },
    overlayOpacity: 35,
    height: 'medium',
    imageUrl: 'linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 52%, #2BFF88 90%)',
    colorScheme: {
      primary: '#2BD2FF',
      text: '#ffffff',
    },
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Contemporary design with clean lines',
    style: 'modern',
    overlayText: 'Crafted for You',
    overlaySubtext: 'Modern design meets traditional craftsmanship',
    ctaButton: {
      text: 'Discover More',
      url: '/products',
    },
    overlayOpacity: 45,
    height: 'medium',
    imageUrl: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    colorScheme: {
      primary: '#ffffff',
      text: '#ffffff',
    },
  },
]
