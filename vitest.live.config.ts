import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Live provider tests — these call fal and Neon for real, so they cost money
 * and need network access. Opt in with `pnpm test:live`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.live.test.ts'],
    testTimeout: 300000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
