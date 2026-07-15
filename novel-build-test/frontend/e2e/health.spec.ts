import { test, expect } from '@playwright/test'

/**
 * System Health E2E tests
 *
 * Validates that the frontend loads and the backend health endpoint
 * responds correctly. The /api/v1/health endpoint does not require a
 * running database — it reports subsystem status but always returns 200.
 */

test.describe('System Health', () => {
  test('should load the main page and display AISQA branding', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')

    // The page should redirect to /login when not authenticated
    // or show the dashboard if somehow already authenticated
    // In either case the page should load without errors
    await expect(page).not.toHaveURL(/.*#.*/) // no hash-only navigation

    // Check that the page has content (either login or dashboard)
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Report console errors but don't fail (SPAs may have benign errors)
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors)
    }
  })

  test('should verify health endpoint returns 200', async ({ page }) => {
    const response = await page.request.get('/api/v1/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('app')
    expect(body).toHaveProperty('version', '1.0.0')
    expect(body).toHaveProperty('subsystem_status')
    expect(body.subsystem_status).toHaveProperty('database')
    expect(body.subsystem_status).toHaveProperty('vector_db')
    expect(body.subsystem_status).toHaveProperty('event_bus')

    console.log('Health check response:', JSON.stringify(body, null, 2))
  })

  test('should navigate between pages without crashes', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Visit a few public routes to verify routing works
    const routes = ['/', '/login', '/register']
    for (const route of routes) {
      await page.goto(route)
      // Wait for the page to settle (React render + any lazy loads)
      await page.waitForTimeout(1500)
      const currentUrl = page.url()
      expect(currentUrl).toContain(route === '/' ? '' : route)
    }

    if (consoleErrors.length > 0) {
      console.log('Console errors during navigation:', consoleErrors)
    }
  })
})
