
// @ts-check
import { test, expect } from '@playwright/test';
console.log('🔍 Running Salesforce Account Creation Test');
test('Create a new Salesforce Account', async ({ page }) => {
  test.setTimeout(120000);

  const username = process.env.SF_USERNAME || 'gyan.ranjan_i5elwpwpzkg@jadeglobal.com';
  const password = process.env.SF_PASSWORD || 'Gy@n4701';

  const accountName = `Test Account ${Date.now()}`;

  // ── 1. Login ──────────────────────────────────────────────────────────────
  await page.goto('https://login.salesforce.com', {
    waitUntil: 'domcontentloaded',
  });

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#Login').click();

  // Salesforce Lightning can keep network requests open, so avoid strict networkidle here.
  await expect(page.locator('[title="App Launcher"]')).toBeVisible({
    timeout: 60000,
  });

  // ── 2. Navigate to Accounts ───────────────────────────────────────────────
  const accountsTab = page
    .locator('one-app-nav-bar-item-root a[title="Accounts"], one-app-nav-bar-item-root a:has-text("Accounts")')
    .first();

  if (await accountsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await accountsTab.click();
  } else {
    await page.locator('[title="App Launcher"]').click();

    const appLauncherSearch = page.locator(
      'input[placeholder="Search apps and items..."], input[placeholder="Search apps or items..."]'
    );

    await expect(appLauncherSearch).toBeVisible({ timeout: 15000 });
    await appLauncherSearch.fill('Accounts');

    const accountsSearchResult = page
      .locator('a[title="Accounts"], a:has-text("Accounts")')
      .first();

    await expect(accountsSearchResult).toBeVisible({ timeout: 15000 });
    await accountsSearchResult.click();
  }

  await expect(page).toHaveURL(/Account|accounts/i, {
    timeout: 30000,
  });

  // ── 3. Open New Account modal ─────────────────────────────────────────────
  const newButton = page
    .locator('a[title="New"], button[name="New"], button:has-text("New")')
    .first();

  await expect(newButton).toBeVisible({ timeout: 30000 });
  await newButton.click();

  const accountModal = page.locator(
    'div[role="dialog"], section[role="dialog"], lightning-quick-action-panel'
  );

  await expect(accountModal.first()).toBeVisible({
    timeout: 30000,
  });

  // ── 4. Fill in Account details ────────────────────────────────────────────
  await page.locator('input[name="Name"]').fill(accountName);

  const phoneInput = page.locator('input[name="Phone"]');
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill('+91-9876543210');
  }

  const websiteInput = page.locator('input[name="Website"]');
  if (await websiteInput.isVisible().catch(() => false)) {
    await websiteInput.fill('https://testaccount.example.com');
  }

  // Industry picklist
  const industryPicklist = page.locator(
    'button[aria-label*="Industry"], button[aria-label="Industry"], [data-field="Industry"] button'
  ).first();

  if (await industryPicklist.isVisible().catch(() => false)) {
    await industryPicklist.click();

    const technologyOption = page.locator(
      'lightning-base-combobox-item span[title="Technology"], span[title="Technology"], [role="option"]:has-text("Technology")'
    ).first();

    await expect(technologyOption).toBeVisible({ timeout: 10000 });
    await technologyOption.click();
  }

  // Type picklist
  const typePicklist = page.locator(
    'button[aria-label*="Type"], button[aria-label="Type"], [data-field="Type"] button'
  ).first();

  if (await typePicklist.isVisible().catch(() => false)) {
    await typePicklist.click();

    const prospectOption = page.locator(
      'lightning-base-combobox-item span[title="Prospect"], span[title="Prospect"], [role="option"]:has-text("Prospect")'
    ).first();

    await expect(prospectOption).toBeVisible({ timeout: 10000 });
    await prospectOption.click();
  }

  const employeesInput = page.locator('input[name="NumberOfEmployees"]');
  if (await employeesInput.isVisible().catch(() => false)) {
    await employeesInput.fill('500');
  }

  const descriptionInput = page.locator('textarea[name="Description"]');
  if (await descriptionInput.isVisible().catch(() => false)) {
    await descriptionInput.fill('Created by Playwright automated test');
  }

  // Billing Address fields may vary by Salesforce org/page layout.
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

  // ── 5. Save ───────────────────────────────────────────────────────────────
  const saveButton = page
    .locator('button[name="SaveEdit"], button:has-text("Save")')
    .first();

  await expect(saveButton).toBeVisible({ timeout: 15000 });
  await saveButton.click();

  // ── 6. Verify account was created ─────────────────────────────────────────
  await expect(
    page.locator('.slds-page-header__title, lightning-formatted-text, slot[name="primaryField"]')
  ).toContainText(accountName, {
    timeout: 30000,
  });

  console.log(`✅ Account successfully created: ${accountName}`);
});
