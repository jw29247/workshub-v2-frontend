import { test, expect, Page } from '@playwright/test'

// Define all pages in the application
const ALL_PAGES = [
  { path: '/app/dashboard', name: 'Dashboard', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/executive-dashboard', name: 'Executive Dashboard', roles: ['manager', 'SLT'] },
  { path: '/app/time/today', name: 'Today View', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/time/week', name: 'Week View', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/time/logs', name: 'All Time Logs', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/clients/retainer', name: 'Retainer Usage', roles: ['manager', 'SLT'] },
  { path: '/app/clients/health', name: 'Client Health', roles: ['manager', 'SLT'] },
  { path: '/app/admin/clients', name: 'Client Management', roles: ['SLT'] },
  { path: '/app/admin/notifications', name: 'Admin Notifications', roles: ['SLT'] },
  { path: '/app/admin/users', name: 'User Management', roles: ['SLT'] },
  { path: '/app/admin/pods', name: 'Pod Management', roles: ['SLT'] },
  { path: '/app/admin/feedback', name: 'Admin Feedback', roles: ['SLT'] },
  { path: '/app/admin/pulse-leadership', name: 'Pulse Check Leadership', roles: ['SLT'] },
  { path: '/app/admin/credit-health', name: 'Credit System Health', roles: ['SLT'] },
  { path: '/app/admin/credit-reconciliation', name: 'Credit Reconciliation', roles: ['manager', 'SLT'] },
  { path: '/app/settings', name: 'Settings', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/tools/pulse', name: 'Pulse Check', roles: ['team_member', 'manager', 'SLT'] },
  { path: '/app/tools/sync', name: 'Time Log Sync', roles: ['manager', 'SLT'] },
]

// Test credentials
const TEST_USER = {
  email: 'jacob@thatworks.agency',
  password: 'TestAdmin123!',
  role: 'SLT' // Testing with SLT role to access all pages
}

// Helper to track console errors
interface ConsoleError {
  page: string
  message: string
  location?: string
  stack?: string
}

test.describe('Console Error Check - All Pages', () => {
  let consoleErrors: ConsoleError[] = []

  test.beforeEach(async ({ page }) => {
    // Clear console errors before each test
    consoleErrors = []

    // Set up console error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const location = msg.location()
        consoleErrors.push({
          page: page.url(),
          message: msg.text(),
          location: location ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
          stack: msg.text()
        })
      }
    })

    // Also track page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      consoleErrors.push({
        page: page.url(),
        message: error.message,
        stack: error.stack
      })
    })
  })

  test.setTimeout(120000) // Increase timeout to 2 minutes

  test('should check all pages for console errors', async ({ page }) => {
    // Navigate to login page

    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Debug: log the current URL and page content

    
    // Wait for either login form or app to be visible (in case already logged in)
    const loginHeading = page.getByRole('heading', { name: /Welcome back/i })
    const appContent = page.locator('[data-testid="app-layout"], .navigation, nav')
    
    // Check if we're already logged in
    if (await appContent.isVisible({ timeout: 5000 }).catch(() => false)) {

    } else {
      // Wait for login form

      await expect(loginHeading).toBeVisible({ timeout: 15000 })
      
      // Try different selectors for email and password fields

      const emailInput = page.locator('input[type="email"], input[placeholder="Email"], input[name="email"], #email')
      const passwordInput = page.locator('input[type="password"], input[placeholder="Password"], input[name="password"], #password')
      
      await emailInput.fill(TEST_USER.email)
      await passwordInput.fill(TEST_USER.password)
      
      // Click sign in button
      const signInButton = page.locator('button:has-text("Sign In"), button[type="submit"]').first()
      await signInButton.click()
      
      // Wait for successful login and navigation

      await page.waitForURL(/\/app/, { timeout: 15000 })
    }
    
    await page.waitForLoadState('networkidle')

    // Check if we need to handle onboarding overlay
    const onboardingOverlay = page.locator('[role="dialog"]').filter({ hasText: /Welcome to WorksHub/i })
    if (await onboardingOverlay.isVisible({ timeout: 2000 })) {
      // Skip onboarding
      const skipButton = page.getByRole('button', { name: /Skip/i })
      if (await skipButton.isVisible()) {
        await skipButton.click()
      } else {
        // If no skip button, close the dialog by clicking outside or pressing Escape
        await page.keyboard.press('Escape')
      }
      await expect(onboardingOverlay).not.toBeVisible()
    }

    // Track errors by page
    const errorsByPage: Record<string, ConsoleError[]> = {}

    // Visit each page
    for (const pageInfo of ALL_PAGES) {
      // Only test pages accessible by the test user's role
      if (!pageInfo.roles.includes(TEST_USER.role)) {
        continue
      }

      console.log(`Checking ${pageInfo.name} (${pageInfo.path})...`)

      // Clear previous page errors
      const errorsBeforeNavigation = consoleErrors.length

      try {
        // Navigate to the page
        await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 15000 })
        
        // Wait a bit to ensure all async operations complete
        await page.waitForTimeout(1000)

        // Check for new errors on this page
        const newErrors = consoleErrors.slice(errorsBeforeNavigation)
        if (newErrors.length > 0) {
          errorsByPage[pageInfo.name] = newErrors
          console.log(`  ❌ Found ${newErrors.length} error(s)`)
        } else {
          console.log(`  ✅ No errors`)
        }
      } catch (error) {
        console.log(`  ⚠️ Error loading page: ${error.message}`)
        errorsByPage[pageInfo.name] = [{
          page: pageInfo.path,
          message: `Failed to load page: ${error.message}`,
          stack: error.stack
        }]
      }
    }

    // Generate report
    console.log('\n=== Console Error Report ===\n')
    
    if (Object.keys(errorsByPage).length === 0) {
      console.log('✅ No console errors found on any page!')
    } else {
      console.log(`❌ Found console errors on ${Object.keys(errorsByPage).length} pages:\n`)
      
      for (const [pageName, errors] of Object.entries(errorsByPage)) {
        console.log(`\n📄 ${pageName}:`)
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`)
          if (error.location) {
            console.log(`     Location: ${error.location}`)
          }
        })
      }
    }

    // Save detailed error report
    if (Object.keys(errorsByPage).length > 0) {
      const report = {
        timestamp: new Date().toISOString(),
        totalErrors: consoleErrors.length,
        errorsByPage,
        details: consoleErrors
      }
      
      await page.evaluate((reportData) => {
        console.log('=== Detailed Error Report ===')
        console.log(JSON.stringify(reportData, null, 2))
      }, report)
    }

    // Assert no errors were found
    expect(Object.keys(errorsByPage).length).toBe(0)
  })

  test('should check auth pages for console errors', async ({ page }) => {
    const authPages = [
      { path: '/', name: 'Home/Login' },
      { path: '/register', name: 'Register' },
      { path: '/reset-password', name: 'Password Reset' }
    ]

    const authErrorsByPage: Record<string, ConsoleError[]> = {}

    for (const pageInfo of authPages) {
      console.log(`Checking ${pageInfo.name} (${pageInfo.path})...`)
      
      const errorsBeforeNavigation = consoleErrors.length
      
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      
      const newErrors = consoleErrors.slice(errorsBeforeNavigation)
      if (newErrors.length > 0) {
        authErrorsByPage[pageInfo.name] = newErrors
      }
    }

    // Report auth page errors
    if (Object.keys(authErrorsByPage).length > 0) {
      console.log('\n=== Auth Pages Console Errors ===\n')
      for (const [pageName, errors] of Object.entries(authErrorsByPage)) {
        console.log(`\n📄 ${pageName}:`)
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`)
        })
      }
    }

    expect(Object.keys(authErrorsByPage).length).toBe(0)
  })
})
