import { defineConfig } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  // Starts the app with the scripted mock model, so the test needs no real
  // model and gives the same result every time.
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { PROVIDER: 'mock' },
    reuseExistingServer: false,
  },
});
