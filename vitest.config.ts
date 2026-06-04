import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'demo/**',
        'example/**',
        'scripts/**',
        'src/test-setup.ts',
        'src/test-utils/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'dist/**',
        '*.config.js',
        '*.config.ts',
        'rollup.config.js',
        'postcss.config.js',
        'tailwind.config.ts',
        'src/index.ts',
        '**/index.ts',
        '**/*.d.ts',
        '.rollup.cache/**',
        'src/shared/types/context.types.ts',
        'src/shared/lib/context.tsx',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/entities': path.resolve(__dirname, './src/entities'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/widgets': path.resolve(__dirname, './src/widgets'),
    },
  },
});
