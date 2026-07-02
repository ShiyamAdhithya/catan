import { defineConfig, mergeConfig } from 'vitest/config';

import base from './base.js';

/**
 * Shared Vitest configuration for Node.js packages.
 *
 * This configuration extends the workspace base configuration and is
 * intended for libraries and backend packages.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: 'node',
    },
  }),
);