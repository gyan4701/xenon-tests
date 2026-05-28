
// @ts-check
const { test, expect } = require('@playwright/test');

test('Create a new Salesforce Account', async ({ page }) => {

  // ── 1. Login ──────────────────────────────────────────────────────────────
  await page.goto('https://login.salesforce.com');
  await page.locator('#username').fill('gyan.ranjan_i5elwpwpzkg@jadeglobal.com');
  await page.locator('#password').fill('Gy@n4701');
  await page.locator('#Login').click();

  // Wait for home page to confirm login success
  await expect(page.locator('[title="App Launcher"]')).toBeVisible({ timeout: 30_000 });

  // ── 2. Navigate to Accounts ───────────────────────────────────────────────
  const accountsTab = page.locator('one-app-nav-bar-item-root a:has-text("Accounts")').first();

  if (await accountsTab.isVisible()) {
    await accountsTab.click();
  } else {
    await page.locator('[title="App Launcher"]').click();
    await page.locator('input[placeholder="Search apps and items..."]').fill('Accounts');
    await page.locator('a:has-text("Accounts")').first().click();
  }

  await expect(page).toHaveURL(/Account/, { timeout: 15_000 });

  // ── 3. Open New Account modal ─────────────────────────────────────────────
  await page.locator('a[title="New"], button:has-text("New")').first().click();
  await expect(page.locator('[class*="modal"], lightning-quick-action-panel')).toBeVisible({ timeout: 10_000 });

  // ── 4. Fill in Account details ────────────────────────────────────────────
  const accountName = Test Account ${Date.now()};

  await page.locator('input[name="Name"]').fill(accountName);
  await page.locator('input[name="Phone"]').fill('+91-9876543210');
  await page.locator('input[name="Website"]').fill('https://testaccount.example.com');

  // Industry picklist
  await page.locator('button[aria-label*="Industry"]').click();
  await page.locator('span[title="Technology"]').click();

  // Type picklist
  await page.locator('button[aria-label*="Type"]').click();
  await page.locator('span[title="Prospect"]').click();

  await page.locator('input[name="NumberOfEmployees"]').fill('500');
  await page.locator('textarea[name="Description"]').fill('Created by Playwright automated test');

  // Billing Address
  await page.locator('textarea[name="BillingStreet"]').fill('123 Main Street');
  await page.locator('input[name="BillingCity"]').fill('Mumbai');
  await page.locator('input[name="BillingState"]').fill('Maharashtra');
  await page.locator('input[name="BillingPostalCode"]').fill('400001');
  await page.locator('input[name="BillingCountry"]').fill('India');

  // ── 5. Save ───────────────────────────────────────────────────────────────
  await page.locator('button[name="SaveEdit"], button:has-text("Save")').first().click();

  // ── 6. Verify account was created ─────────────────────────────────────────
  await expect(page.locator('.slds-page-header__title, lightning-formatted-text'))
    .toContainText(accountName, { timeout: 15_000 });

  console.log(✅ Account successfully created: ${accountName});
});
