// @ts-check
import { test, expect } from '@playwright/test';
import LoginUtil from '../../../../server/utils/loginUtil';

test('SELF HEAL DEMO - Create Salesforce Lead with locator failure', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const secret = process.env.SF_TOTP_SECRET;

  const leadLastName = `Self Heal Lead ${Date.now()}`;
  const leadCompany = `Self Heal Company ${Date.now()}`;
  const leadEmail = `self.heal.lead.${Date.now()}@example.com`;
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

    throw new Error(
      [
        'Could not resolve Salesforce org origin.',
        'Recommended fix: add SF_INSTANCE_URL to your .env file:',
        'SF_INSTANCE_URL=https://enterprise-platform-3896.lightning.force.com',
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

      if (expectedUrlPattern.test(currentUrl)) {
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
          ].join('\n')
        );
      }
    }
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

  // ── 1. Authenticate using existing storageState or fresh TOTP login ────────
  const sessionCookieExists = await hasSessionCookie();

  if (!sessionCookieExists) {
    console.log('🔐 No Salesforce session cookie found.');
    await performFreshLogin('No saved Salesforce session cookie found');
  } else {
    console.log('▶ Salesforce session cookie found in storageState.json');
    console.log('ℹ️ Session will be validated by opening the Leads page.');
  }

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Open Leads list page ───────────────────────────────────────────────
  await openSalesforcePathWithSessionRepair({
    salesforceOrigin,
    path: '/lightning/o/Lead/list?filterName=Recent',
    expectedUrlPattern: /\/lightning\/o\/Lead\/list/i,
    label: 'Leads list page',
  });

  await page.waitForTimeout(2000);

  // ── 3. Intentional locator failure for self-heal demo ─────────────────────
  console.log('➕ Opening New Lead form with intentional broken locator...');

  /*
    SELF-HEAL DEMO FAILURE:

    This locator is intentionally wrong.
    There is no Salesforce button with data-testid="broken-new-lead-button".

    Expected self-heal correction:
    - page.getByRole('button', { name: /^New$/ })
    OR
    - page.locator('a[title="New"], button[name="New"], button:has-text("New")').first()
  */
  await page
    .locator('button[data-testid="broken-new-lead-button"]')
    .click({ timeout: 10000 });

  // After self-heal, the above line should be corrected and the form should open.
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
    page.locator('input[name="firstName"], input[name="FirstName"]').first(),
    'SelfHeal',
    'First Name'
  );

  await lastNameInput.fill(leadLastName);
  console.log('⌨️ Filled Last Name');

  const companyInput = page.locator('input[name="Company"]').first();

  await expect(companyInput).toBeVisible({
    timeout: 30000,
  });

  await companyInput.fill(leadCompany);
  console.log('⌨️ Filled Company');

  await fillIfVisible(page.locator('input[name="Phone"]').first(), leadPhone, 'Phone');
  await fillIfVisible(page.locator('input[name="Email"]').first(), leadEmail, 'Email');

  await fillIfVisible(
    page.locator('input[name="Title"]').first(),
    'Self Heal Demo Lead',
    'Title'
  );

  await fillIfVisible(
    page.locator('textarea[name="Description"]').first(),
    'Created by MCP Executor self-heal locator demo',
    'Description'
  );

  await page.screenshot({
    path: `./reports/self-heal-lead-form-filled-${Date.now()}.png`,
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
    path: `./reports/self-heal-lead-created-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Lead successfully created after self-heal: ${leadLastName} / ${leadCompany}`);
});
