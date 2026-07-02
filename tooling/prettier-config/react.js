import base from './base.js';

/**
 * Shared Prettier configuration for React applications.
 *
 * React applications currently use the same formatting rules as the
 * workspace default configuration. This file exists as the extension
 * point for future React-specific overrides.
 */

/** @type {import("prettier").Config} */
const config = {
  ...base,
};

export default config;