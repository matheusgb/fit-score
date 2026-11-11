import { defineConfig } from '@playwright/test';

const port = 4310;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${port}` },
  // Exige `npm run build` antes: o servidor serve o front compilado em dist/web.
  webServer: {
    command: 'node dist/server/main.js',
    env: { PORT: String(port), HOST: '127.0.0.1' },
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});
