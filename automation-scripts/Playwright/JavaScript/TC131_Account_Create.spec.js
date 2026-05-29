// @ts-check
import { test, expect } from '@playwright/test';
import LoginUtil from '../../../server/utils/loginUtil';

test('Create Salesforce Account (automated login with TOTP)', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const secret = process.env.SF_TOTP_SECRET;

  const accountName = `Auto Account ${Date.now()}`;

  const hasSessionCookie = async () => {
    const state = await page.context().storageState().catch(() => ({}));

    return (state.cookies || []).some((cookie) =>
      /sid|session|auth/i.test(cookie.name)
    );
  };

  const ensureSalesforceSession = async () => {
    const currentUrl = page.url();

    if (/login|challenge|verification|identity/i.test(currentUrl)) {
      throw new Error(
        `Salesforce session is not authenticated. Current URL: ${currentUrl}`
      );
    }

    const usernameInputVisible = await page
      .locator('#username, input[name="username"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (usernameInputVisible) {
      throw new Error(
        'Salesforce redirected to login page. Stored session is expired or invalid.'
      );
    }
  };

  const resolveSalesforceOrigin = async () => {
    const configuredInstance =
      process.env.SF_INSTANCE_URL ||
      process.env.SALESFORCE_INSTANCE_URL;

    if (configuredInstance) {
      const origin = new URL(configuredInstance).origin;
      console.log(`✅ Using Salesforce origin from env: ${origin}`);
      return origin;
    }

    // Fast path: resolve org domain from saved storageState cookies.
    // This avoids the previous 60-second silent wait on about:blank.
    const state = await page.context().storageState().catch(() => ({}));
    const cookies = state.cookies || [];

    const lightningCookie = cookies.find((cookie) =>
      /lightning\.force\.com/i.test(cookie.domain)
    );

    if (lightningCookie?.domain) {
      const origin = `https://${lightningCookie.domain.replace(/^\./, '')}`;
      console.log(`✅ Using Salesforce origin from lightning cookie: ${origin}`);
      return origin;
    }

    const mySalesforceCookie = cookies.find((cookie) =>
      /my\.salesforce\.com/i.test(cookie.domain)
    );

    if (mySalesforceCookie?.domain) {
      const domain = mySalesforceCookie.domain.replace(/^\./, '');
      const lightningDomain = domain.replace(
        '.my.salesforce.com',
        '.lightning.force.com'
      );

      const origin = `https://${lightningDomain}`;
      console.log(`✅ Using Salesforce origin from my.salesforce cookie: ${origin}`);
      return origin;
    }

    const forceCookie = cookies.find((cookie) =>
      /force\.com/i.test(cookie.domain)
    );

    if (forceCookie?.domain) {
      const domain = forceCookie.domain.replace(/^\./, '');

      const origin = domain.includes('lightning.force.com')
        ? `https://${domain}`
        : `https://${domain.replace('.my.salesforce.com', '.lightning.force.com')}`;

      console.log(`✅ Using Salesforce origin from force.com cookie: ${origin}`);
      return origin;
    }

    const salesforceCookie = cookies.find((cookie) =>
      /salesforce\.com/i.test(cookie.domain)
    );

    if (salesforceCookie?.domain) {
      const domain = salesforceCookie.domain.replace(/^\./, '');

      const origin = domain.includes('my.salesforce.com')
        ? `https://${domain.replace('.my.salesforce.com', '.lightning.force.com')}`
        : `https://${domain}`;

      console.log(`✅ Using Salesforce origin from salesforce.com cookie: ${origin}`);
      return origin;
    }

    // Last fallback: use current page URL, but do not wait unnecessarily.
    const currentUrl = page.url();

    if (currentUrl && currentUrl !== 'about:blank') {
      try {
        const origin = new URL(currentUrl).origin;

        if (!/login\.salesforce\.com/i.test(origin)) {
          console.log(`✅ Using Salesforce origin from current page: ${origin}`);
          return origin;
        }
      } catch (error) {
        // Ignore and throw clear error below.
      }
    }

    throw new Error(
      [
        'Could not resolve Salesforce org origin quickly.',
        '',
        'Recommended fix: add SF_INSTANCE_URL to your .env file:',
        'SF_INSTANCE_URL=https://enterprise-platform-3896.lightning.force.com',
        '',
        `Current URL: ${currentUrl}`,
      ].join('\n')
    );
  };

  const clickFirstVisible = async (locators, timeout = 30000) => {
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

  // ── 1. Authenticate using existing saved state or TOTP login ───────────────
  const savedState = await page.context().storageState().catch(() => ({}));
  const hasSavedSession = (savedState.cookies || []).some((cookie) =>
    /sid|session|auth/i.test(cookie.name)
  );

  if (!hasSavedSession && (!username || !password || !secret)) {
    test.skip(
      true,
      'SF credentials missing: set SF_USERNAME, SF_PASSWORD, SF_TOTP_SECRET, or create storageState.json using saveAuthState.spec.js'
    );
  }

  const loginUtil = new LoginUtil(page);

  if (!(await hasSessionCookie())) {
    console.log('🔐 No active stored Salesforce session found. Logging in with TOTP...');
    await loginUtil.loginWithTotp({ username, password, secret });

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    console.log('▶ Using existing authenticated session from storageState.json');
  }

  // If stored session was present but expired and current context lands on login screen,
  // perform fresh TOTP login. This check is fast and does not wait 60 seconds.
  const onLoginPage =
    (await page.locator('#username').isVisible({ timeout: 3000 }).catch(() => false)) ||
    (await page.locator('input[name="username"]').isVisible({ timeout: 3000 }).catch(() => false));

  if (onLoginPage) {
    console.log('⚠️ Stored session is invalid. Performing fresh TOTP login...');

    if (!username || !password || !secret) {
      throw new Error(
        'Session appears invalid and SF credentials are not set. Set SF_USERNAME, SF_PASSWORD, SF_TOTP_SECRET or refresh storageState.json.'
      );
    }

    await loginUtil.loginWithTotp({ username, password, secret });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);
  }

  console.log('✅ Logged in successfully, proceeding to create Account');

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Navigate to Account list page ──────────────────────────────────────
  console.log('📂 Opening Accounts list page...');

  await page.goto(`${salesforceOrigin}/lightning/o/Account/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await ensureSalesforceSession();

  await expect(page).toHaveURL(/\/lightning\/o\/Account\/list/i, {
    timeout: 60000,
  });

  await page.waitForTimeout(2000);
  console.log('✅ Accounts list page opened');

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

  // Do not wait for a generic dialog. Salesforce may have hidden auraError dialogs.
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

  await fillIfVisible(page.locator('input[name="Phone"]'), '123-456-7890', 'Phone');

  await fillIfVisible(
    page.locator('input[name="Website"]'),
    'https://testaccount.example.com',
    'Website'
  );

  await fillIfVisible(
    page.locator('input[name="NumberOfEmployees"]'),
    '500',
    'Number of Employees'
  );

  const descriptionInput = page.locator('textarea[name="Description"]');
  if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await descriptionInput.fill('Created by Playwright automated test');
    console.log('⌨️ Filled Description');
  }

  // Optional Industry picklist
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

  // Optional Type picklist
  const typePicklist = page
    .locator(
      'button[aria-label*="Type"], button[aria-label="Type"], [data-field="Type"] button'
    )
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

  // Optional Billing Address fields
  await fillIfVisible(
    page.locator('textarea[name="BillingStreet"]'),
    '123 Main Street',
    'Billing Street'
  );

  await fillIfVisible(
    page.locator('input[name="BillingCity"]'),
    'Mumbai',
    'Billing City'
  );

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

  await fillIfVisible(
    page.locator('input[name="BillingCountry"]'),
    'India',
    'Billing Country'
  );

  await page.screenshot({
    path: `./reports/salesforce-account-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 5. Save Account ───────────────────────────────────────────────────────
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

  await expect(page).toHaveURL(/\/lightning\/r\/Account\//i, {
    timeout: 60000,
  });

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
