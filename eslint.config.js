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
      // Generated video-render assets (gitignored): vendored GSAP, a render script,
      // and media. Not source — linting it produced 216 errors and no signal.
      'videos/**',
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

      // Token ratchet: new hardcoded palette utilities in className strings
      // should use the semantic tokens instead (bg-brand, text-success,
      // text-warning, text-info, text-destructive, text-muted-foreground).
      //
      // Warn-level on purpose, matching the existing no-explicit-any /
      // no-unused-vars ratchet above: pre-existing occurrences are known debt,
      // and the point is to stop new ones landing. Deliberate exceptions
      // (chain-identity colors) are listed in the override block below.
      //
      // Limitation: this matches string literals in className attributes. A
      // palette class composed inside a template literal or a variable is not
      // caught — the guard raises the floor, it does not seal the ceiling.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/(^|[\\s\"'`])(bg|text|border|ring|from|to|via|fill|stroke|decoration|shadow|divide|placeholder|outline|caret|accent)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}/]",
          message:
            'Hardcoded palette utility in className. Use a semantic token instead: brand | success | warning | info | destructive | muted-foreground (see app/globals.css).',
        },
        {
          // White text on a semantic fill fails contrast in dark mode (the
          // palette lightens brand/success/warning/info to pastels). Pair the
          // fill with its -foreground token, or use the matching Button
          // variant (brand | success | warning | info). Alpha fills below 50%
          // are subtle tints where white text is acceptable, so only solid and
          // >=50% fills are flagged.
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/(bg-(brand|primary|success|warning|info)(\\x2f(5[0-9]|[6-9][0-9]|100))?[^\\w\\x2f-][^\"']*text-white|text-white[^\"']*bg-(brand|primary|success|warning|info)(\\x2f(5[0-9]|[6-9][0-9]|100))?[^\\w\\x2f-])/]",
          message:
            'text-white on a semantic fill fails dark-mode contrast. Use the matching -foreground token (text-brand-foreground, text-success-foreground, ...) or the Button variant instead.',
        },
      ],
    },
  },
  // Deliberate palette exception: NetworkIndicator uses amber/blue for Mezo vs
  // Base chain identity, which is not a status meaning.
  {
    files: ['components/layout/NetworkIndicator.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Fastify API and PM2 ecosystem files are plain JS/CJS, not TypeScript.
  // Give them CommonJS source type and allow require/module.exports.
  {
    files: [
      'apps/writersarcade-api/**/*.js',
      'apps/writersarcade-api/**/*.cjs',
      'apps/imessage-agent/**/*.cjs',
    ],
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
