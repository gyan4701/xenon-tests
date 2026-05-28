// @ts-check
import { test, expect } from '@playwright/test';

console.log('🔍 Running Salesforce Account Creation Test');

test('Create a new Salesforce Account', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;

  if (!username || !password) {
    throw new Error('SF_USERNAME and SF_PASSWORD environment variables are required.');
  }

  const accountName = `Test Account ${Date.now()}`;

  // ── 1. Login ──────────────────────────────────────────────────────────────
  console.log('🚀 Opening Salesforce login page...');

  await page.goto('https://login.salesforce.com', {
    waitUntil: 'domcontentloaded',
  });

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#Login').click();

  console.log('🔐 Submitted Salesforce login form');

  // Salesforce may redirect through contentDoor/file.force.com before Lightning opens.
  await page.waitForURL(
    /lightning\.force\.com|my\.salesforce\.com|file\.force\.com/,
    { timeout: 90000 }
  );

  // Wait until Salesforce finishes the major redirect chain.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);

  console.log(`📍 Current URL after login: ${page.url()}`);

  // If login failed, Salesforce usually keeps user on login/challenge pages.
  if (/login|challenge|verification|identity/i.test(page.url())) {
    throw new Error(
      `Salesforce login did not complete. Current URL: ${page.url()}`
    );
  }

  // ── 2. Navigate directly to Accounts list page ────────────────────────────
  console.log('📂 Navigating directly to Accounts object page...');

  const lightningBaseUrl = new URL(page.url()).origin;

  await page.goto(`${lightningBaseUrl}/lightning/o/Account/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await page.waitForTimeout(5000);

  await expect(page).toHaveURL(/\/lightning\/o\/Account\/list/i, {
    timeout: 60000,
  });

  console.log('✅ Navigated to Accounts list page');

  // ── 3. Open New Account modal ─────────────────────────────────────────────
  console.log('➕ Opening New Account modal...');

  const newButton = page
    .locator('a[title="New"], button[name="New"], button:has-text("New")')
    .first();

  await expect(newButton).toBeVisible({ timeout: 60000 });
  await newButton.click();

  const accountModal = page.locator(
    'div[role="dialog"], section[role="dialog"], lightning-quick-action-panel'
  );

  await expect(accountModal.first()).toBeVisible({
    timeout: 30000,
  });

  console.log('✅ New Account modal opened');

  // ── 4. Fill Account details ───────────────────────────────────────────────
  console.log(`📝 Filling Account details: ${accountName}`);

  await page.locator('input[name="Name"]').fill(accountName);

  const phoneInput = page.locator('input[name="Phone"]');
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill('+91-9876543210');
  }

  const websiteInput = page.locator('input[name="Website"]');
  if (await websiteInput.isVisible().catch(() => false)) {
    await websiteInput.fill('https://testaccount.example.com');
  }

  const employeesInput = page.locator('input[name="NumberOfEmployees"]');
  if (await employeesInput.isVisible().catch(() => false)) {
    await employeesInput.fill('500');
  }

  const descriptionInput = page.locator('textarea[name="Description"]');
  if (await descriptionInput.isVisible().catch(() => false)) {
    await descriptionInput.fill('Created by Playwright automated test');
  }

  // Optional Billing Address fields; availability depends on page layout.
  const billingStreet = page.locator('textarea[name="BillingStreet"]');
  if (await billingStreet.isVisible().catch(() => false)) {
    await billingStreet.fill('123 Main Street');
  }

  const billingCity = page.locator('input[name="BillingCity"]');
  if (await billingCity.isVisible().catch(() => false)) {
    await billingCity.fill('Mumbai');
  }

  const billingState = page.locator('input[name="BillingState"]');
  if (await billingState.isVisible().catch(() => false)) {
    await billingState.fill('Maharashtra');
  }

  const billingPostalCode = page.locator('input[name="BillingPostalCode"]');
  if (await billingPostalCode.isVisible().catch(() => false)) {
    await billingPostalCode.fill('400001');
  }

  const billingCountry = page.locator('input[name="BillingCountry"]');
  if (await billingCountry.isVisible().catch(() => false)) {
    await billingCountry.fill('India');
  }

  await page.screenshot({
    path: `./reports/salesforce-account-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 5. Save ───────────────────────────────────────────────────────────────
  console.log('💾 Saving Account...');

  const saveButton = page
    .locator('button[name="SaveEdit"], button:has-text("Save")')
    .first();

  await expect(saveButton).toBeVisible({ timeout: 30000 });
  await saveButton.click();

  // ── 6. Verify Account creation ────────────────────────────────────────────
  console.log('🔎 Verifying Account creation...');

  await expect(
    page.locator('.slds-page-header__title, lightning-formatted-text, slot[name="primaryField"]')
  ).toContainText(accountName, {
    timeout: 60000,
  });

  await page.screenshot({
    path: `./reports/salesforce-account-created-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Account successfully created: ${accountName}`);
});
