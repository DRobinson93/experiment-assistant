import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The same "@/..." shortcut the app uses, so tests can import the API route.
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // Only the unit tests; the Playwright test in e2e/ has its own runner.
  test: { include: ['tests/**/*.test.ts'] },
});
