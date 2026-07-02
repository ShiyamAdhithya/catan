import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for the Catan workspace.
 *
 * This configuration provides the default test behavior for all
 * workspace packages. Environment-specific configurations should
 * extend this file.
 */
export default defineConfig({
  test: {
    // Test discovery
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
    ],

    // Default runtime
    environment: 'node',

    // Developer experience
    globals: true,

    // Cleanup
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});