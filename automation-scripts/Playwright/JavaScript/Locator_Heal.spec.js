// @ts-check
const { test, expect } = require('@playwright/test');

test('SELF HEAL DEMO - Create Salesforce Lead with broken New locator', async ({ page }) => {
  test.setTimeout(30000);

  const salesforceOrigin =
    process.env.SF_INSTANCE_URL ||
    process.env.SALESFORCE_INSTANCE_URL ||
    'https://enterprise-platform-3896.lightning.force.com';

  const leadLastName = `Self Heal Lead ${Date.now()}`;
  const leadCompany = `Self Heal Company ${Date.now()}`;
  const leadEmail = `self.heal.lead.${Date.now()}@example.com`;
  const leadPhone = '123-456-7890';

  console.log('🚀 Starting Salesforce Lead self-heal locator demo...');
  console.log(`🌐 Salesforce Origin: ${salesforceOrigin}`);

  const clickFirstVisible = async (locators, timeout = 30000) => {
    const deadline = Date.now() + timeout;

    for (const locator of locators) {
      const remaining = Math.max(deadline - Date.now(), 1000);

      try {
        const candidate = locator.first();

        await expect(candidate).toBeVisible({
          timeout: Math.min(remaining, 8000),
        });

        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: Math.min(remaining, 10000) });

        return true;
      } catch (error) {
        // Try next locator.
      }
    }

    throw new Error(`None of the provided locators became visible within ${timeout}ms.`);
  };

  const fillIfVisible = async (locator, value, label) => {
    const candidate = locator.first();

    if (await candidate.isVisible({ timeout: 3000 }).catch(() => false)) {
      await candidate.fill(value);
      console.log(`⌨️ Filled ${label}`);
      return true;
    }

    console.log(`ℹ️ Skipped ${label}; field not visible on this layout`);
    return false;
  };

  // ── 1. Open Leads page using existing storageState ────────────────────────
  await page.goto(`${salesforceOrigin}/lightning/o/Lead/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  if (/login|challenge|verification|identity/i.test(currentUrl)) {
    throw new Error(
      [
        'Salesforce stored session is expired or not loaded.',
        'This is not a locator self-heal error.',
        'Refresh storageState.json first, then rerun this demo.',
        `Current URL: ${currentUrl}`,
      ].join('\n')
    );
  }

  const usernameVisible = await page
    .locator('#username, input[name="username"]')
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (usernameVisible) {
    throw new Error(
      [
        'Salesforce login screen is visible.',
        'This is not a locator self-heal error.',
        'Refresh storageState.json first, then rerun this demo.',
      ].join('\n')
    );
  }

  await expect(page).toHaveURL(/\/lightning\/o\/Lead\/list/i, {
    timeout: 60000,
  });

  console.log('✅ Leads list page opened using stored session');

  // ── 2. Intentional locator failure for self-heal demo ─────────────────────
  console.log('➕ Opening New Lead form using intentionally broken locator...');

  /*
    SELF-HEAL DEMO FAILURE:

    This locator is intentionally wrong:
      div[aria-label="New"]

    The label is still "New", so your selfHealService can generate useful
    candidates such as getByRole('button', { name: /^New$/i }) or [title="New"].

    Keep this as a single-line Playwright action.
  */
  await page.locator('div[aria-label="New"]').click({ timeout: 10000 });

  const lastNameInput = page
    .locator('input[name="lastName"], input[name="LastName"]')
    .first();

  await expect(lastNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Lead form is visible after healed locator');

  // ── 3. Fill Lead details ──────────────────────────────────────────────────
  console.log(`📝 Filling Lead details: ${leadLastName}`);

  await fillIfVisible(
    page.locator('input[name="firstName"], input[name="FirstName"]'),
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

  await fillIfVisible(page.locator('input[name="Email"]'), leadEmail, 'Email');
  await fillIfVisible(page.locator('input[name="Phone"]'), leadPhone, 'Phone');

  await fillIfVisible(
    page.locator('input[name="Title"]'),
    'Self Heal Demo Lead',
    'Title'
  );

  await fillIfVisible(
    page.locator('textarea[name="Description"]'),
    'Created by MCP Executor self-heal locator demo',
    'Description'
  );

  await page.screenshot({
    path: `./reports/self-heal-lead-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 4. Save Lead ──────────────────────────────────────────────────────────
  console.log('💾 Saving Lead...');

  /*
    Salesforce can render multiple Save buttons, some hidden.
    Do not use .first() directly here.
    This is the same safer pattern from the earlier working Lead script.
  */
  await clickFirstVisible(
    [
      page.locator('button[name="SaveEdit"]'),
      page.getByRole('button', { name: /^Save$/ }),
      page.locator('button:has-text("Save")'),
      page.locator('.slds-button:has-text("Save")'),
      page.locator('button.test-saveButton'),
    ],
    30000
  );

  console.log('🔘 Clicked Save button');

  // ── 5. Verify Lead creation ───────────────────────────────────────────────
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
