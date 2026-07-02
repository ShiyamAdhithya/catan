/**
 * Shared Prettier configuration for the Catan workspace.
 *
 * This configuration defines the default formatting rules for all
 * workspace packages and applications.
 *
 * React applications should extend this configuration rather than
 * redefining formatting rules.
 */

/** @type {import("prettier").Config} */
const config = {
  // General
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,

  // JavaScript / TypeScript
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',

  // Objects
  bracketSpacing: true,
  bracketSameLine: false,

  // Misc
  endOfLine: 'lf',
};

export default config;