import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/lib/__tests__/**/*.{test,spec}.{js,jsx}', 'src/hooks/__tests__/**/*.{test,spec}.{js,jsx}'],
    exclude: [
      'node_modules/**',
      'src/tests/**',
      'src/components/__tests__/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**'
      ]
    }
  }
});
