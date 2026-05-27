const { test: base, expect } = require('@playwright/test');

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login using environment-driven selectors and credentials
    await page.goto(process.env.BASE_URL);
    await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
    await page.fill('#username', process.env.LOGIN_USERNAME);
    await page.fill('#password', process.env.LOGIN_PASSWORD);
    await page.click('#Login');
    await page.waitForSelector('.slds-global-header, one-app-nav-bar, lightning-app', { state: 'visible', timeout: 60000 });

    // Handle any welcome modals
    try {
      const modal = page.locator('button:has-text("Close"), button[title="Close"]');
      if (await modal.isVisible({ timeout: 3000 })) {
        await modal.click();
      }
    } catch (e) {
      // No modal present or other error, continue
    }

    // Provide the authenticated page to the test
    await use(page);

    // Logout after test
    try {
      await page.locator('button.branding-userProfile-button, span.uiImage').first().click();
      await page.waitForSelector('a[href*="logout"], a:has-text("Log Out")', { state: 'visible', timeout: 5000 });
      await page.locator('a[href*="logout"], a:has-text("Log Out")').first().click();
      await page.waitForLoadState('networkidle');
    } catch (e) {
      // Logout failed or element not found, continue cleanup
      console.warn('Logout failed or element not found:', e.message);
    }
  },
});

module.exports = { test, expect };