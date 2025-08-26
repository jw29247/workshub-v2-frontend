import { test, expect } from '@playwright/test'

test.describe('Executive Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    
    // Login as SLT user
    await page.fill('input[type="email"]', 'jacob@thatworks.agency')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to complete
    await page.waitForURL('/app/**')
    
    // Navigate to executive dashboard
    await page.goto('/app/executive-dashboard')
  })

  test('should load executive dashboard without errors', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('Executive Dashboard')
    
    // Check that key metrics are displayed
    await expect(page.locator('text=Total Clients')).toBeVisible()
    await expect(page.locator('text=Avg Utilization')).toBeVisible()
    await expect(page.locator('text=Clients at Risk')).toBeVisible()
    await expect(page.locator('text=Potential Revenue')).toBeVisible()
  })

  test('should fetch and display analytics data', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle')
    
    // Check that data is displayed (not loading spinner)
    await expect(page.locator('.loading-spinner')).not.toBeVisible()
    
    // Check that charts are rendered
    await expect(page.locator('.recharts-wrapper')).toHaveCount(2) // Two charts expected
    
    // Check that at-risk clients table is displayed if there are any
    const tableExists = await page.locator('text=Clients Requiring Attention').isVisible()
    if (tableExists) {
      await expect(page.locator('table')).toBeVisible()
    }
  })

  test('should allow data export', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Click export button
    const exportButton = page.locator('button:has-text("Export CSV")')
    await expect(exportButton).toBeVisible()
    await expect(exportButton).not.toBeDisabled()
    
    // Test that clicking doesn't cause errors
    await exportButton.click()
    
    // Check for success toast or download
    await expect(page.locator('.sonner-toast')).toBeVisible({ timeout: 10000 })
  })

  test('should show appropriate controls for SLT role', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // SLT users should see the Send Alerts button
    await expect(page.locator('button:has-text("Send Alerts")')).toBeVisible()
    
    // Check other action buttons
    await expect(page.locator('button:has-text("Weekly Summary")')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Intercept API calls and return errors
    await context.route('**/api/analytics/**', route => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      })
    })
    
    // Reload the page
    await page.reload()
    
    // Should show error toast
    await expect(page.locator('.sonner-toast')).toContainText('Failed to load dashboard data')
    
    // Should not crash the page
    await expect(page.locator('h1')).toContainText('Executive Dashboard')
  })

  test('should restrict access for non-authorized roles', async ({ page, context }) => {
    // Logout first
    await page.goto('/app/settings')
    await page.click('button:has-text("Logout")')
    
    // Login as team member
    await page.goto('/login')
    await page.fill('input[type="email"]', 'sandy@thatworks.agency')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation
    await page.waitForURL('/app/**')
    
    // Try to access executive dashboard
    await page.goto('/app/executive-dashboard')
    
    // Should redirect to regular dashboard
    await expect(page).toHaveURL('/app/dashboard')
  })
})
