import { test, expect } from '@playwright/test'

// Test credentials
const TEST_USER = {
  email: 'jacob@thatworks.agency',
  password: 'TestAdmin123!',
}

test.describe('Console Error Check - Simple', () => {
  test('check specific pages for console errors', async ({ page }) => {
    const consoleErrors: string[] = []

    // Set up console error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`${page.url()}: ${msg.text()}`)
      }
    })

    // Navigate to login page
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    
    // Click the email input and fill it
    await page.click('input[type="email"]')
    await page.fill('input[type="email"]', TEST_USER.email)
    
    // Click the password input and fill it
    await page.click('input[type="password"]')
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Click sign in button
    await page.click('button[type="submit"]')
    
    // Wait for navigation
    await page.waitForURL('**/app/**', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Check specific pages that have errors
    const pagesToCheck = [
      { url: 'http://localhost:5173/app/clients/retainer', name: 'Retainer Usage' },
      { url: 'http://localhost:5173/app/clients/health', name: 'Client Health' },
      { url: 'http://localhost:5173/app/admin/clients', name: 'Client Management' },
    ]

    

    for (const pageInfo of pagesToCheck) {
      const errorsBeforeNav = consoleErrors.length
      
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      
      const newErrors = consoleErrors.length - errorsBeforeNav
      if (newErrors > 0) {
        console.log(`❌ ${pageInfo.name} has ${newErrors} console errors`)
        const pageErrors = consoleErrors.slice(errorsBeforeNav)
        pageErrors.forEach(err => console.log(`  ${err}`))
      } else {
        console.log(`✅ ${pageInfo.name} has no console errors`)
      }
    }

    // Print all errors summary
    console.log(`\n📊 Total console errors found: ${consoleErrors.length}`)
    
    if (consoleErrors.length > 0) {
      console.log('\n📋 All console errors:')
      consoleErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`)
      })
    }

    // Assert no errors for test to pass
    expect(consoleErrors.length).toBe(0)
  })
})
