// @ts-check
import { test, expect } from '@playwright/test';
import LoginUtil from '../../../../server/utils/loginUtil';

test('Create Salesforce Lead (automated login with TOTP)', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const secret = process.env.SF_TOTP_SECRET;

  const leadLastName = `Auto Lead ${Date.now()}`;
  const leadCompany = `Auto Company ${Date.now()}`;
  const leadEmail = `auto.lead.${Date.now()}@example.com`;
  const leadPhone = '123-456-7890';

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

  const selectPicklistIfVisible = async ({
    buttonLocator,
    optionText,
    label,
  }) => {
    const picklist = buttonLocator.first();

    if (!(await picklist.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log(`ℹ️ Skipped ${label}; picklist not visible on this layout`);
      return false;
    }

    await picklist.click();
    console.log(`🔘 Opened ${label} picklist`);

    const option = page
      .locator(
        [
          `lightning-base-combobox-item span[title="${optionText}"]`,
          `span[title="${optionText}"]`,
          `[role="option"]:has-text("${optionText}")`,
        ].join(', ')
      )
      .first();

    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    console.log(`✅ Selected ${label}: ${optionText}`);
    return true;
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

  console.log('✅ Logged in successfully, proceeding to create Lead');

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Navigate to Lead list page ─────────────────────────────────────────
  console.log('📂 Opening Leads list page...');

  await page.goto(`${salesforceOrigin}/lightning/o/Lead/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await ensureSalesforceSession();

  await expect(page).toHaveURL(/\/lightning\/o\/Lead\/list/i, {
    timeout: 60000,
  });

  await page.waitForTimeout(2000);
  console.log('✅ Leads list page opened');

  // ── 3. Open New Lead form ─────────────────────────────────────────────────
  console.log('➕ Opening New Lead form...');

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

  // Do not wait for generic dialog because Salesforce may have hidden auraError dialogs.
  // Wait for Lead required fields instead.
  const lastNameInput = page.locator('input[name="lastName"], input[name="LastName"]').first();

  await expect(lastNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Lead form is visible');

  // ── 4. Fill Lead details ──────────────────────────────────────────────────
  console.log(`📝 Filling Lead details: ${leadLastName}`);

  await fillIfVisible(page.locator('input[name="salutation"]').first(), 'Mr.', 'Salutation');

  await fillIfVisible(
    page.locator('input[name="firstName"], input[name="FirstName"]').first(),
    'Auto',
    'First Name'
  );

  await lastNameInput.fill(leadLastName);
  console.log('⌨️ Filled Last Name');

  const companyInput = page.locator('input[name="Company"]').first();
  await expect(companyInput).toBeVisible({ timeout: 30000 });
  await companyInput.fill(leadCompany);
  console.log('⌨️ Filled Company');

  await fillIfVisible(page.locator('input[name="Phone"]').first(), leadPhone, 'Phone');
  await fillIfVisible(page.locator('input[name="Email"]').first(), leadEmail, 'Email');
  await fillIfVisible(page.locator('input[name="Title"]').first(), 'Automation Lead', 'Title');

  await fillIfVisible(
    page.locator('input[name="Website"]').first(),
    'https://testlead.example.com',
    'Website'
  );

  // Optional Lead Status picklist
  await selectPicklistIfVisible({
    buttonLocator: page.locator(
      'button[aria-label*="Lead Status"], button[aria-label*="Status"], [data-field="Status"] button'
    ),
    optionText: 'Open - Not Contacted',
    label: 'Lead Status',
  }).catch((error) => {
    console.log(`ℹ️ Skipped Lead Status due to org-specific value/layout: ${error.message}`);
  });

  // Optional Lead Source picklist
  await selectPicklistIfVisible({
    buttonLocator: page.locator(
      'button[aria-label*="Lead Source"], [data-field="LeadSource"] button'
    ),
    optionText: 'Web',
    label: 'Lead Source',
  }).catch((error) => {
    console.log(`ℹ️ Skipped Lead Source due to org-specific value/layout: ${error.message}`);
  });

  // Optional Rating picklist
  await selectPicklistIfVisible({
    buttonLocator: page.locator(
      'button[aria-label*="Rating"], [data-field="Rating"] button'
    ),
    optionText: 'Warm',
    label: 'Rating',
  }).catch((error) => {
    console.log(`ℹ️ Skipped Rating due to org-specific value/layout: ${error.message}`);
  });

  const descriptionInput = page.locator('textarea[name="Description"]').first();

  if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await descriptionInput.fill('Created by Playwright automated test');
    console.log('⌨️ Filled Description');
  } else {
    console.log('ℹ️ Skipped Description; field not visible on this layout');
  }

  // Optional Address fields
  await fillIfVisible(page.locator('textarea[name="Street"]').first(), '123 Main Street', 'Street');
  await fillIfVisible(page.locator('input[name="City"]').first(), 'Mumbai', 'City');
  await fillIfVisible(page.locator('input[name="State"]').first(), 'Maharashtra', 'State');
  await fillIfVisible(page.locator('input[name="PostalCode"]').first(), '400001', 'Postal Code');
  await fillIfVisible(page.locator('input[name="Country"]').first(), 'India', 'Country');

  await page.screenshot({
    path: `./reports/salesforce-lead-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 5. Save Lead ──────────────────────────────────────────────────────────
  console.log('💾 Saving Lead...');

  await clickFirstVisible(
    [
      page.locator('button[name="SaveEdit"]'),
      page.getByRole('button', { name: /^Save$/ }),
      page.locator('button:has-text("Save")'),
    ],
    30000
  );

  console.log('🔘 Clicked Save button');

  // ── 6. Verify Lead creation ───────────────────────────────────────────────
  console.log('🔎 Verifying Lead creation...');

  await expect(page).toHaveURL(/\/lightning\/r\/Lead\//i, {
    timeout: 60000,
  });

  const createdLeadTitle = page
    .locator('lightning-formatted-name, lightning-formatted-text[slot="primaryField"]')
    .filter({ hasText: leadLastName })
    .first();

  const createdLeadAnyText = page
    .getByText(leadLastName, { exact: false })
    .first();

  if (await createdLeadTitle.isVisible({ timeout: 10000 }).catch(() => false)) {
    await expect(createdLeadTitle).toContainText(leadLastName, {
      timeout: 60000,
    });
  } else {
    await expect(createdLeadAnyText).toBeVisible({
      timeout: 60000,
    });
  }

  await page.screenshot({
    path: `./reports/salesforce-lead-created-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Lead successfully created: ${leadLastName} / ${leadCompany}`);
});