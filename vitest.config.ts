import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
    // `*.live.test.ts` files hit real providers (fal, Neon) — they cost money
    // and need network, so they are opt-in via `pnpm test:live`.
    exclude: [
      '**/*.live.test.ts',
      '**/node_modules/**',
      '**/.next/**',
      'lib/openzeppelin-contracts/**',
      'contracts/openzeppelin-contracts/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
