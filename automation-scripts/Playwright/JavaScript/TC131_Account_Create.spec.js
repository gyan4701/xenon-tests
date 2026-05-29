// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

function resolveStoredSessionPath() {
  const candidates = [
    // When running from project root: D:\xenon-ai
    path.resolve(process.cwd(), 'mcp-executor', 'storageState.json'),

    // When running from MCP executor folder: D:\xenon-ai\mcp-executor
    path.resolve(process.cwd(), 'storageState.json'),

    // When script is inside tests folder
    path.resolve(currentDir, '..', 'mcp-executor', 'storageState.json'),

    // When script is copied into MCP temp workspace
    path.resolve(currentDir, '..', '..', 'storageState.json'),
  ];

  const existingPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existingPath) {
    throw new Error(
      [
        'Salesforce storageState.json was not found.',
        '',
        'Run this first:',
        'node .\\mcp-executor\\auth.setup.js',
        '',
        'Checked paths:',
        ...candidates.map((candidate) => `- ${candidate}`),
      ].join('\n')
    );
  }

  return existingPath;
}

const storedSession = {
  storageState: resolveStoredSessionPath(),
};

test.use({
  storageState: storedSession.storageState,
});

async function ensureSalesforceSession(page) {
  const currentUrl = page.url();

  if (/login|challenge|verification|identity/i.test(currentUrl)) {
    throw new Error(
      [
        'Salesforce session is expired or invalid.',
        `Current URL: ${currentUrl}`,
        '',
        'Run auth setup again:',
        'node .\\mcp-executor\\auth.setup.js',
      ].join('\n')
    );
  }

  const usernameInputVisible = await page
    .locator('#username')
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (usernameInputVisible) {
    throw new Error(
      [
        'Salesforce redirected to login page.',
        'Your stored session has expired.',
        '',
        'Run auth setup again:',
        'node .\\mcp-executor\\auth.setup.js',
      ].join('\n')
    );
  }
}

async function fillIfVisible(locator, value, label) {
  if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
    await locator.fill(value);
    console.log(`⌨️ Filled ${label}`);
    return true;
  }

  console.log(`ℹ️ Skipped ${label}; field not visible on this layout`);
  return false;
}

async function clickFirstVisible(page, locators, timeout = 30000) {
  const deadline = Date.now() + timeout;

  for (const locator of locators) {
    const remaining = Math.max(deadline - Date.now(), 1000);

    try {
      await expect(locator.first()).toBeVisible({
        timeout: Math.min(remaining, 8000),
      });

      await locator.first().click();
      return true;
    } catch (error) {
      // Try next locator.
    }
  }

  throw new Error(`None of the provided locators became visible within ${timeout}ms.`);
}

test('Create a new Salesforce Account using stored session', async ({ page }) => {
  test.setTimeout(180000);

  console.log('🚀 Starting Salesforce Account creation test...');
  console.log(`🔐 Using stored Salesforce session: ${storedSession.storageState}`);

  const salesforceBaseUrl =
    process.env.SF_INSTANCE_URL ||
    process.env.SALESFORCE_INSTANCE_URL ||
    'https://enterprise-platform-3896.lightning.force.com';

  const accountName = `Test Account ${Date.now()}`;

  // ── 1. Open Accounts page using stored session ────────────────────────────
  console.log('📂 Opening Salesforce Accounts page...');

  await page.goto(`${salesforceBaseUrl}/lightning/o/Account/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await ensureSalesforceSession(page);

  await expect(page).toHaveURL(/\/lightning\/o\/Account\/list/i, {
    timeout: 60000,
  });

  console.log('✅ Salesforce session is active');
  console.log('✅ Navigated to Accounts list page');

  await page.screenshot({
    path: `./reports/salesforce-accounts-page-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 2. Open New Account form ──────────────────────────────────────────────
  console.log('➕ Opening New Account form...');

  await clickFirstVisible(
    page,
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

  // Do not wait for generic dialog. Salesforce may have hidden auraError dialogs.
  // Wait for the actual Account Name input.
  const accountNameInput = page.locator('input[name="Name"]');

  await expect(accountNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Account form is visible');

  // ── 3. Fill Account details ───────────────────────────────────────────────
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

    await expect(technologyOption).toBeVisible({
      timeout: 10000,
    });

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

    await expect(prospectOption).toBeVisible({
      timeout: 10000,
    });

    await prospectOption.click();
    console.log('✅ Selected Type: Prospect');
  } else {
    console.log('ℹ️ Skipped Type; picklist not visible on this layout');
  }

  // Optional Billing Address fields.
  await fillIfVisible(
    page.locator('textarea[name="BillingStreet"]'),
    '123 Main Street',
    'Billing Street'
  );

  await fillIfVisible(page.locator('input[name="BillingCity"]'), 'Mumbai', 'Billing City');

  await fillIfVisible(
    page.locator('input[name="BillingState"]'),
    'Maharashtra',
    'Billing State'
  );

  await fillIfVisible(
    page.locator('input[name="BillingPostalCode"]'),
    '400001',
    'Billing Postal Code'
  );

  await fillIfVisible(page.locator('input[name="BillingCountry"]'), 'India', 'Billing Country');

  await page.screenshot({
    path: `./reports/salesforce-account-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 4. Save ───────────────────────────────────────────────────────────────
  console.log('💾 Saving Account...');

  await clickFirstVisible(
    page,
    [
      page.locator('button[name="SaveEdit"]'),
      page.getByRole('button', { name: /^Save$/ }),
      page.locator('button:has-text("Save")'),
    ],
    30000
  );

  console.log('🔘 Clicked Save button');

  // ── 5. Verify Account creation ────────────────────────────────────────────
  console.log('🔎 Verifying Account creation...');

  const createdAccountTitle = page
    .locator('lightning-formatted-text[slot="primaryField"]')
    .filter({ hasText: accountName })
    .first();

  const createdAccountAnyText = page.getByText(accountName, { exact: true }).first();

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
