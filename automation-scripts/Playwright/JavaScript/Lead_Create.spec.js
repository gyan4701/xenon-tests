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

      if (
        loginVisible ||
        contentDoorStuck ||
        /my\.salesforce\.com\/?$/i.test(currentUrl)
      ) {
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
  const sessionCookieExists = await hasSessionCookie();

  if (!sessionCookieExists) {
    console.log('🔐 No Salesforce session cookie found.');
    await performFreshLogin('No saved Salesforce session cookie found');
  } else {
    console.log('▶ Salesforce session cookie found in storageState.json');
    console.log('ℹ️ Session will be validated by opening the Lead page.');
  }

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Navigate to Lead list page with session repair ─────────────────────
  await openSalesforcePathWithSessionRepair({
    salesforceOrigin,
    path: '/lightning/o/Lead/list?filterName=Recent',
    expectedUrlPattern: /\/lightning\/o\/Lead\/list/i,
    label: 'Leads list page',
  });

  await page.waitForTimeout(2000);

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

  const lastNameInput = page
    .locator('input[name="lastName"], input[name="LastName"]')
    .first();

  await expect(lastNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Lead form is visible');

  // ── 4. Fill Lead details ──────────────────────────────────────────────────
  console.log(`📝 Filling Lead details: ${leadLastName}`);

  await fillIfVisible(
    page.locator('input[name="salutation"]').first(),
    'Mr.',
    'Salutation'
  );

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

  await fillIfVisible(
    page.locator('input[name="Title"]').first(),
    'Automation Lead',
    'Title'
  );

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
  await fillIfVisible(
    page.locator('textarea[name="Street"]').first(),
    '123 Main Street',
    'Street'
  );

  await fillIfVisible(
    page.locator('input[name="City"]').first(),
    'Mumbai',
    'City'
  );

  await fillIfVisible(
    page.locator('input[name="State"]').first(),
    'Maharashtra',
    'State'
  );

  await fillIfVisible(
    page.locator('input[name="PostalCode"]').first(),
    '400001',
    'Postal Code'
  );

  await fillIfVisible(
    page.locator('input[name="Country"]').first(),
    'India',
    'Country'
  );

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
