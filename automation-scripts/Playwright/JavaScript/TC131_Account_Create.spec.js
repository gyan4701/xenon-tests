// @ts-check
import { test, expect } from '@playwright/test';

test('Create ', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME || 'gyan.ranjan_i5elwpwpzkg@jadeglobal.com';
  const password = process.env.SF_PASSWORD || 'Gy@n4701';

  if (!username || !password) {
    throw new Error('SF_USERNAME and SF_PASSWORD environment variables are required.');
  }

  const accountName = `Test Account ${Date.now()}`;

  const clickFirstVisible = async (locators, timeout = 30000) => {
    for (const locator of locators) {
      try {
        await expect(locator.first()).toBeVisible({ timeout: 5000 });
        await locator.first().click();
        return true;
      } catch (error) {
        // Try next locator.
      }
    }

    throw new Error(`None of the provided locators became visible within ${timeout}ms.`);
  };

  const fillIfVisible = async (locator, value, label) => {
    if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locator.fill(value);
      console.log(`⌨️ Filled ${label}`);
      return true;
    }

    console.log(`ℹ️ Skipped ${label}; field not visible on this layout`);
    return false;
  };

  // ── 1. Login ──────────────────────────────────────────────────────────────
  console.log('🚀 Opening Salesforce login page...');

  await page.goto('https://login.salesforce.com', {
    waitUntil: 'domcontentloaded',
  });

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#Login').click();

  console.log('🔐 Submitted Salesforce login form');

  await page.waitForURL(
    /lightning\.force\.com\/one\/one\.app|my\.salesforce\.com\/one\/one\.app/i,
    { timeout: 120000 }
  );

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);

  console.log(`📍 Current URL after login: ${page.url()}`);

  if (/login|challenge|verification|identity/i.test(page.url())) {
    throw new Error(`Salesforce login did not complete. Current URL: ${page.url()}`);
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

  await page.screenshot({
    path: `./reports/salesforce-accounts-page-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 3. Open New Account form ──────────────────────────────────────────────
  console.log('➕ Opening New Account form...');

  await clickFirstVisible(
    [
      page.getByRole('button', { name: /^New$/ }),
      page.getByRole('link', { name: /^New$/ }),
      page.locator('a[title="New"]'),
      page.locator('button[name="New"]'),
      page.locator('button:has-text("New")'),
    ],
    60000
  );

  await page.screenshot({
    path: `./reports/salesforce-new-account-click-${Date.now()}.png`,
    fullPage: true,
  });

  // Do not wait for generic dialog because Salesforce can have hidden auraError dialogs.
  // Wait for the actual Account Name field instead.
  const accountNameInput = page.locator('input[name="Name"]');

  await expect(accountNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Account form is visible');

  // ── 4. Fill Account details ───────────────────────────────────────────────
  console.log(`📝 Filling Account details: ${accountName}`);

  await accountNameInput.fill(accountName);
  console.log('⌨️ Filled Account Name');

  await fillIfVisible(page.locator('input[name="Phone"]'), '+91-9876543210', 'Phone');
  await fillIfVisible(
    page.locator('input[name="Website"]'),
    'https://testaccount.example.com',
    'Website'
  );
  await fillIfVisible(page.locator('input[name="NumberOfEmployees"]'), '500', 'Employees');

  const descriptionInput = page.locator('textarea[name="Description"]');
  if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await descriptionInput.fill('Created by Playwright automated test');
    console.log('⌨️ Filled Description');
  }

  // Optional picklist: Industry
  const industryPicklist = page
    .locator(
      'button[aria-label*="Industry"], button[aria-label="Industry"], [data-field="Industry"] button'
    )
    .first();

  if (await industryPicklist.isVisible({ timeout: 3000 }).catch(() => false)) {
    await industryPicklist.click();
    console.log('🔘 Opened Industry picklist');

    const technologyOption = page
      .locator(
        'lightning-base-combobox-item span[title="Technology"], span[title="Technology"], [role="option"]:has-text("Technology")'
      )
      .first();

    await expect(technologyOption).toBeVisible({ timeout: 10000 });
    await technologyOption.click();

    console.log('✅ Selected Industry: Technology');
  } else {
    console.log('ℹ️ Skipped Industry; picklist not visible on this layout');
  }

  // Optional picklist: Type
  const typePicklist = page
    .locator('button[aria-label*="Type"], button[aria-label="Type"], [data-field="Type"] button')
    .first();

  if (await typePicklist.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typePicklist.click();
    console.log('🔘 Opened Type picklist');

    const prospectOption = page
      .locator(
        'lightning-base-combobox-item span[title="Prospect"], span[title="Prospect"], [role="option"]:has-text("Prospect")'
      )
      .first();

    await expect(prospectOption).toBeVisible({ timeout: 10000 });
    await prospectOption.click();

    console.log('✅ Selected Type: Prospect');
  } else {
    console.log('ℹ️ Skipped Type; picklist not visible on this layout');
  }

  // Optional Billing Address fields; availability depends on page layout.
  await fillIfVisible(page.locator('textarea[name="BillingStreet"]'), '123 Main Street', 'Billing Street');
  await fillIfVisible(page.locator('input[name="BillingCity"]'), 'Mumbai', 'Billing City');
  await fillIfVisible(page.locator('input[name="BillingState"]'), 'Maharashtra', 'Billing State');
  await fillIfVisible(page.locator('input[name="BillingPostalCode"]'), '400001', 'Billing Postal Code');
  await fillIfVisible(page.locator('input[name="BillingCountry"]'), 'India', 'Billing Country');

  await page.screenshot({
    path: `./reports/salesforce-account-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 5. Save ───────────────────────────────────────────────────────────────
  console.log('💾 Saving Account...');

  await clickFirstVisible(
    [
      page.locator('button[name="SaveEdit"]'),
      page.getByRole('button', { name: /^Save$/ }),
      page.locator('button:has-text("Save")'),
    ],
    30000
  );

  console.log('🔘 Clicked Save button');

  // ── 6. Verify Account creation ────────────────────────────────────────────
  console.log('🔎 Verifying Account creation...');

const createdAccountTitle = page
  .locator('lightning-formatted-text[slot="primaryField"]')
  .filter({ hasText: accountName })
  .first();

const createdAccountAnyText = page
  .getByText(accountName, { exact: true })
  .first();

if (await createdAccountTitle.isVisible({ timeout: 10000 }).catch(() => false)) {
  await expect(createdAccountTitle).toHaveText(accountName, {
    timeout: 60000,
  });
} else {
  await expect(createdAccountAnyText).toBeVisible({
    timeout: 60000,
  });
}

  await page.screenshot({
    path: `./reports/salesforce-account-created-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Account successfully created: ${accountName}`);
});
