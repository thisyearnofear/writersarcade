// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '.git/**',
      'test-content-processor.ts',
      'scripts/**',
      'public/client.min.js',
      'lib/openzeppelin-contracts/**',
      'contracts/openzeppelin-contracts/**',
      // NOTE: apps/writersarcade-api is intentionally linted now.
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Downgrade new strict rules to warnings
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
    },
  },
  // Fastify API and PM2 ecosystem files are plain JS/CJS, not TypeScript.
  // Give them CommonJS source type and allow require/module.exports.
  {
    files: ['apps/writersarcade-api/**/*.js', 'apps/writersarcade-api/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
  // Test files in the Fastify API use ESM imports.
  {
    files: ['apps/writersarcade-api/**/*.test.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
