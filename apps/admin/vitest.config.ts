import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@madebuy/db': path.resolve(__dirname, '../../packages/db/src'),
      '@madebuy/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@madebuy/social': path.resolve(__dirname, '../../packages/social/src'),
      '@madebuy/storage': path.resolve(__dirname, '../../packages/storage/src'),
    },
  },
})
