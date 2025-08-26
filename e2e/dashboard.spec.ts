import { test, expect } from '@playwright/test'

test.describe('Dashboard Component', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses for authentication and dashboard data
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        })
      })
    })

    // Mock the credit summary endpoint with missing properties
    await page.route('**/api/credit-summary', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_balance_hours: 100.5,
          // Intentionally omitting total_credits_added_hours and total_credits_used_hours
          // to test the error handling
        })
      })
    })

    // Mock other required endpoints
    await page.route('**/api/time-tracking/today', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [{
            user_email: 'test@example.com',
            total_hours: 5.5
          }]
        })
      })
    })

    await page.route('**/api/time-tracking/week', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          total_hours: 35,
          daily_hours: {},
          users: []
        })
      })
    })

    await page.route('**/api/time-tracking/statistics**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_hours_today: 5.5,
          total_hours_yesterday: 6.0,
          total_hours_week: 35,
          total_hours_last_week: 40,
          team_utilization: 85
        })
      })
    })

    await page.route('**/api/user-settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.route('**/api/health/client-monitoring', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statuses: [],
          metrics: {
            clients_needing_attention: 0,
            clients_on_track: 5,
            clients_exceeding_targets: 2
          }
        })
      })
    })

    await page.route('**/api/heartbeat/team', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [],
          metrics: {
            active_today: 5,
            average_hours: 6.5,
            total_team_hours: 32.5
          }
        })
      })
    })

    // Set auth token in localStorage
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'test-token')
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      }))
    })
  })

  test('handles undefined credit summary properties gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Wait for the dashboard to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page doesn't crash and error boundary isn't triggered
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    
    // Check that the credit balance section is visible
    await expect(page.locator('text=Total Credit Balance')).toBeVisible()
    
    // Check that undefined values show as em dashes
    await expect(page.locator('text=Added (period)')).toBeVisible()
    await expect(page.locator('text=Used (period)')).toBeVisible()
    
    // The undefined values should display as em dashes
    const addedPeriodElement = page.locator('text=Added (period)').locator('..').locator('p').nth(1)
    const usedPeriodElement = page.locator('text=Used (period)').locator('..').locator('p').nth(1)
    
    await expect(addedPeriodElement).toHaveText('—')
    await expect(usedPeriodElement).toHaveText('—')
    
    // The total balance should display correctly since it's provided
    await expect(page.locator('text=100.5h')).toBeVisible()
  })

  test('displays all dashboard sections properly', async ({ page }) => {
    // Mock all credit summary properties properly
    await page.route('**/api/credit-summary', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_balance_hours: 100.5,
          total_credits_added_hours: 50.0,
          total_credits_used_hours: 25.5
        })
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check main dashboard elements are visible
    await expect(page.locator('text=Today\'s Progress')).toBeVisible()
    await expect(page.locator('text=This Week')).toBeVisible()
    await expect(page.locator('text=Team Utilization')).toBeVisible()
    await expect(page.locator('text=Total Credit Balance')).toBeVisible()
    
    // Check that credit values display correctly when provided
    await expect(page.locator('text=100.5h')).toBeVisible()
    await expect(page.locator('text=50.0h')).toBeVisible()
    await expect(page.locator('text=25.5h')).toBeVisible()
    
    // Check personal progress section
    await expect(page.locator('text=My Progress Today')).toBeVisible()
    await expect(page.locator('text=5.5h')).toBeVisible()
    
    // Check that no errors are shown
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('dashboard remains responsive and fast', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Check that interactive elements respond quickly
    const interactiveElements = await page.locator('button, a').all()
    
    for (const element of interactiveElements.slice(0, 5)) { // Test first 5 elements
      const isVisible = await element.isVisible()
      if (isVisible) {
        const clickStartTime = Date.now()
        await element.hover()
        const hoverTime = Date.now() - clickStartTime
        
        // Hover interactions should be instant (< 100ms)
        expect(hoverTime).toBeLessThan(100)
      }
    }
  })
})
