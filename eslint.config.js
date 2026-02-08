const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'test/**',
      'coverage/**',
      '*.min.js',
      'test/eval/jquery.min.js',
      'rollup.config.mjs',
      'jest.config.js',
      'eslint.config.js'
    ]
  },
  // Base config for all TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-fallthrough': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^lastLastLastLastPart' }],
      '@typescript-eslint/no-unsafe-assignment': 'off',
    }
  }
];
