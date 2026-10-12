import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

process.env.TZ = 'Asia/Kolkata'; // the house timezone; the engine must not care

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/wit/**', 'src/api/**'],
      exclude: ['**/*.test.ts', '**/__snapshots__/**', 'src/engine/types.ts', 'src/api/geo.ts'],
      thresholds: {
        'src/engine/**': { lines: 95 },
        'src/engine/comfort.ts': { lines: 100 },
        'src/engine/tags.ts': { lines: 100 },
        'src/engine/score.ts': { lines: 100 },
        'src/engine/cache.ts': { lines: 100 },
      },
    },
  },
});
