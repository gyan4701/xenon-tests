const { test, expect } = require('@playwright/test');

test.describe('Salesforce Account Creation', () => {

  test('Verify successful Account creation with required fields', async ({ page }) => {

    // 🔹 Increase timeout
    test.setTimeout(120000);

    // ✅ Directly open Lightning (authenticated via storageState.json)
    await page.goto(
      'https://orgfarm-33b82f167b-dev-ed.develop.lightning.force.com/lightning/page/home'
    );

    // ---------------- APP LAUNCHER ----------------
    await page.waitForSelector('button[title="App Launcher"]', { timeout: 60000 });
    await page.click('button[title="App Launcher"]');

    await page.waitForSelector('button:has-text("View All")');
    await page.click('button:has-text("View All")');

    await page.waitForSelector(
      'one-app-launcher-app-tile[data-name="Sales"]',
      { timeout: 60000 }
    );
    await page.click('one-app-launcher-app-tile[data-name="Sales"]');

    // ---------------- ACCOUNTS ----------------
    await page.waitForSelector('a[title="Accounts"]', { timeout: 60000 });
    await page.click('a[title="Accounts"]');

    // Click New
    const newBtn = page.locator(
  'li[data-target-selection-name="sfdc:StandardButton.Account.New"] a'
);
    await newBtn.waitFor({ state: 'visible' });
    await newBtn.click({ force: true });

    // ---------------- ACCOUNT FORM ----------------
    // Fill Account Name (required)
    const accountName = `Playwright Account ${Date.now()}`;
    await page.fill(
      'input[name="Name"]',
      accountName
    );

    // Save
    await page.click('button[name="SaveEdit"]');

    // ---------------- VERIFICATION ----------------
    const toast = page.locator('span.toastMessage');
    await expect(toast).toContainText('Account');

  });

});
