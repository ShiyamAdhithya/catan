import { defineConfig, mergeConfig } from 'vitest/config';

import base from './base.js';

/**
 * Shared Vitest configuration for React applications.
 *
 * This configuration extends the workspace base configuration and
 * configures a browser-like test environment.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: 'jsdom',
    },
  }),
);