import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  user: async ({ page }, use) => {
    // Step 1: Simulate login to Salesforce as a Business Development Manager (BDM) user.
    // In a real scenario, this would involve navigating to the login page,
    // filling in username/password, and clicking login.
    // For this example, we'll navigate to a base URL and assume the user is logged in.
    // Replace 'https://your-salesforce-instance.com' with your actual Salesforce URL.
    await page.goto('https://your-salesforce-instance.com/lightning/page/home');
    await page.waitForLoadState('networkidle');

    // Add an assertion to verify successful login, e.g., checking for a common Salesforce UI element.
    // This example checks for the global header, which is usually present after login.
    await expect(page.locator('div.slds-global-header')).toBeVisible();

    await use(page); // Provide the logged-in page object to the test
  },
});

export { expect };
