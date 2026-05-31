// @ts-check
import { test, expect } from '@playwright/test';
import LoginUtil from '../../../server/utils/loginUtil';

test('Create Salesforce Account (automated login with TOTP)', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const secret = process.env.SF_TOTP_SECRET;

  const accountName = `Auto Account ${Date.now()}`;

  const loginUtil = new LoginUtil(page);

  const hasSessionCookie = async () => {
    const state = await page.context().storageState().catch(() => ({}));

    return (state.cookies || []).some((cookie) => {
      const cookieNameLooksLikeSession = /sid|session|auth/i.test(cookie.name);
      const cookieDomainLooksLikeSalesforce = /salesforce\.com|force\.com/i.test(
        cookie.domain || ''
      );

      return cookieNameLooksLikeSession && cookieDomainLooksLikeSalesforce;
    });
  };

  const isLoginScreenVisible = async () => {
    return (
      (await page
        .locator('#username, input[name="username"]')
        .first()
        .isVisible({ timeout: 2500 })
        .catch(() => false)) ||
      /login|challenge|verification|identity/i.test(page.url())
    );
  };

  const isSalesforceContentDoorStuck = () => {
    const currentUrl = page.url();

    return (
      /file\.force\.com\/secur\/contentDoor/i.test(currentUrl) ||
      /my\.salesforce\.com\/\?ec=302/i.test(currentUrl)
    );
  };

  const performFreshLogin = async (reason) => {
    console.log(`🔐 Performing fresh Salesforce TOTP login. Reason: ${reason}`);

    if (!username || !password || !secret) {
      throw new Error(
        [
          'Salesforce session is invalid and credentials are missing.',
          'Set these environment variables:',
          'SF_USERNAME',
          'SF_PASSWORD',
          'SF_TOTP_SECRET',
        ].join('\n')
      );
    }

    await loginUtil.loginWithTotp({ username, password, secret });

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);

    if (await isLoginScreenVisible()) {
      throw new Error(
        `Fresh Salesforce login did not complete. Current URL: ${page.url()}`
      );
    }

    console.log('✅ Fresh Salesforce TOTP login completed');
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
        'Could not resolve Salesforce org origin.',
        '',
        'Recommended fix: add SF_INSTANCE_URL to your .env file:',
        'SF_INSTANCE_URL=https://enterprise-platform-3896.lightning.force.com',
        '',
        `Current URL: ${currentUrl}`,
      ].join('\n')
    );
  };

  const ensureSalesforceSession = async () => {
    if (await isLoginScreenVisible()) {
      throw new Error(
        `Salesforce session is not authenticated. Current URL: ${page.url()}`
      );
    }

    if (isSalesforceContentDoorStuck()) {
      throw new Error(
        `Salesforce session is stuck in contentDoor redirect. Current URL: ${page.url()}`
      );
    }
  };

  const openSalesforcePathWithSessionRepair = async ({
    salesforceOrigin,
    path,
    expectedUrlPattern,
    label,
  }) => {
    const targetUrl = `${salesforceOrigin}${path}`;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      console.log(`📂 Opening ${label}. Attempt ${attempt}: ${targetUrl}`);

      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });

      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      console.log(`🌐 URL after navigation attempt ${attempt}: ${currentUrl}`);

      const reachedExpectedUrl = expectedUrlPattern.test(currentUrl);

      if (reachedExpectedUrl) {
        await ensureSalesforceSession();
        console.log(`✅ ${label} opened`);
        return;
      }

      const loginVisible = await isLoginScreenVisible();
      const contentDoorStuck = isSalesforceContentDoorStuck();

      if (loginVisible || contentDoorStuck || /my\.salesforce\.com\/?$/i.test(currentUrl)) {
        if (attempt === 1) {
          await performFreshLogin(
            loginVisible
              ? 'Salesforce redirected to login screen'
              : 'Stored session is stale and Salesforce is stuck in redirect/contentDoor'
          );

          continue;
        }
      }

      if (attempt === 2) {
        throw new Error(
          [
            `Could not open ${label}.`,
            `Expected URL pattern: ${expectedUrlPattern}`,
            `Current URL: ${page.url()}`,
            '',
            'The stored Salesforce session may be expired. Refresh storageState or check SF_INSTANCE_URL.',
          ].join('\n')
        );
      }
    }
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
  const sessionCookieExists = await hasSessionCookie();

  if (!sessionCookieExists) {
    console.log('🔐 No Salesforce session cookie found.');
    await performFreshLogin('No saved Salesforce session cookie found');
  } else {
    console.log('▶ Salesforce session cookie found in storageState.json');
    console.log('ℹ️ Session will be validated by opening the Account page.');
  }

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Navigate to Account list page with session repair ──────────────────
  await openSalesforcePathWithSessionRepair({
    salesforceOrigin,
    path: '/lightning/o/Account/list?filterName=Recent',
    expectedUrlPattern: /\/lightning\/o\/Account\/list/i,
    label: 'Accounts list page',
  });

  await page.waitForTimeout(2000);

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
