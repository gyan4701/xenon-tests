const { test: base, expect } = require('@playwright/test');

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login to Salesforce
    await page.goto('https://fa-esev-dev18-saasfademo1.ds-fa.oraclepdemos.com/xmlpserver/services/ExternalReportWSSService');
    await page.waitForSelector('#username', { state: 'visible', timeout: 30000 });
    await page.fill('#username', '/* CREDENTIALS NOT CONFIGURED - Add in Configurations */');
    await page.fill('#password', '/* CREDENTIALS NOT CONFIGURED - Add in Configurations */');
    await page.click('#Login');
    await page.waitForSelector('.slds-global-header, one-app-nav-bar, lightning-app', { state: 'visible', timeout: 60000 });

    // Handle any welcome modals
    try {
      const modal = page.locator('button:has-text("Close"), button[title="Close"]');
      if (await modal.isVisible({ timeout: 3000 })) {
        await modal.click();
      }
    } catch (e) {
      // No modal present, continue
    }
    await use(page);

    // Logout after test
    try {
      await page.locator('button.branding-userProfile-button, span.uiImage').first().click();
      await page.waitForSelector('a[href*="logout"], a:has-text("Log Out")', { state: 'visible', timeout: 5000 });
      await page.locator('a[href*="logout"], a:has-text("Log Out")').first().click();
      await page.waitForLoadState('networkidle');
    } catch (e) {
      // Logout failed, continue cleanup
    }
  },
});

module.exports = { test, expect };