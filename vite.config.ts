import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build: the same dist/index.html is published as the web artifact
// and copied into the Capacitor Android project.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 60000,
  },
});
