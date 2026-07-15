import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command:
        'cd /Users/sakura-snow/aprillove/novel-generator/novel-build-test/backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
})
