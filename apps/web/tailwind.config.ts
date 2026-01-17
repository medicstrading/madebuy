import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        border: 'hsl(var(--border, 0 0% 90%))',
        input: 'hsl(var(--input, 0 0% 90%))',
        ring: 'hsl(var(--ring, 221 83% 53%))',
        background: 'hsl(var(--background, 0 0% 100%))',
        foreground: 'hsl(var(--foreground, 0 0% 4%))',
        muted: {
          DEFAULT: 'hsl(var(--muted, 0 0% 96%))',
          foreground: 'hsl(var(--muted-foreground, 0 0% 45%))',
        },
        // MadeBuy marketplace palette (blue-based, Etsy-inspired layouts)
        mb: {
          blue: '#2563eb',
          'blue-dark': '#1d4ed8',
          'blue-light': '#3b82f6',
          navy: '#1e3a5f',
          sky: '#e0f2fe',
          'sky-dark': '#bae6fd',
          cream: '#f8fafc',
          slate: '#475569',
          'slate-light': '#64748b',
          sand: '#e2e8f0',
          accent: '#10b981',
          'accent-dark': '#059669',
        },
      },
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius-lg, 12px)',
        md: 'var(--radius-sm, 8px)',
        sm: 'calc(var(--radius-sm, 8px) - 2px)',
        full: 'var(--radius-full, 9999px)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
      },
    },
  },
  plugins: [],
}
export default config
