import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@madebuy/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@madebuy/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
})
