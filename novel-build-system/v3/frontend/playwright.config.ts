import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // 离线 E2E：静态 dist + /api/v3 mock（先 `npm run build`；无需真实后端/LLM 密钥）
    command: 'node tests/mock-server.mjs',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
})
